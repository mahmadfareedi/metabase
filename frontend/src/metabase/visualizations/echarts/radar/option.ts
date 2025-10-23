import type { RenderingContext } from "metabase/visualizations/types";

import type { RadarChartFormatters } from "./format";
import type { RadarChartModel, RadarSeriesModel } from "./model/types";

interface RadarOptionConfig {
  showMarkers: boolean;
  showLabels: boolean;
  markerSeriesKeys: string[];
  formatters: RadarChartFormatters;
}

interface RadarSeriesDataItem {
  name: string;
  value: number[];
  rawValues: (number | null)[];
  seriesKey: string;
  itemStyle: {
    color: string;
    borderColor?: string;
    borderWidth?: number;
  };
  symbol?: string;
  symbolSize?: number;
  label?: {
    show: boolean;
    color: string;
    distance?: number;
    formatter: (params: any) => string;
  };
}

const getSeriesData = (
  series: RadarSeriesModel,
  showMarkers: boolean,
  showLabels: boolean,
  renderingContext: RenderingContext,
  formatters: RadarChartFormatters,
): RadarSeriesDataItem => {
  const shouldShowMarker = showMarkers;
  const shouldShowLabel = shouldShowMarker && showLabels;
  return {
    name: series.name,
    value: series.values.map((value) => (value == null ? Number.NaN : value)),
    rawValues: series.values,
    seriesKey: series.key,
    itemStyle: {
      color: series.color,
      borderColor: shouldShowMarker
        ? renderingContext.getColor("bg-white")
        : undefined,
      borderWidth: shouldShowMarker ? 1 : undefined,
    },
    symbol: shouldShowMarker ? "circle" : "none",
    symbolSize: shouldShowMarker ? 5 : 0,
    label: shouldShowLabel
      ? {
          show: true,
          color: renderingContext.getColor("text-primary"),
          distance: 6,
          formatter: (params: any) => {
            const data = params?.data as RadarSeriesDataItem | undefined;
            const seriesKey = data?.seriesKey ?? series.key;

            const valueFromParams = (() => {
              if (typeof params?.value === "number") {
                return params.value as number | null;
              }
              if (Array.isArray(params?.value)) {
                const indicatorIndex =
                  typeof params?.indicatorIndex === "number"
                    ? params.indicatorIndex
                    : typeof params?.dimensionIndex === "number"
                      ? params.dimensionIndex
                      : typeof params?.dataIndex === "number"
                        ? params.dataIndex
                        : 0;
                const raw = params.value[indicatorIndex];
                return typeof raw === "number" ? raw : null;
              }
              return null;
            })();

            if (valueFromParams != null) {
              return formatters.formatMetric(valueFromParams, seriesKey);
            }

            if (Array.isArray(data?.rawValues)) {
              const indicatorIndex =
                typeof params?.indicatorIndex === "number"
                  ? params.indicatorIndex
                  : typeof params?.dimensionIndex === "number"
                    ? params.dimensionIndex
                    : typeof params?.dataIndex === "number"
                      ? params.dataIndex
                      : 0;
              const rawValue = data.rawValues[indicatorIndex];
              return formatters.formatMetric(rawValue, seriesKey);
            }

            return formatters.formatMetric(null, seriesKey);
          },
        }
      : undefined,
  };
};

export const getRadarChartOption = (
  chartModel: RadarChartModel,
  visibleSeries: RadarSeriesModel[],
  renderingContext: RenderingContext,
  { showMarkers, showLabels, markerSeriesKeys, formatters }: RadarOptionConfig,
) => {
  const fontSize = renderingContext.theme.cartesian.label.fontSize;
  const splitLineColor =
    renderingContext.theme.cartesian.splitLine.lineStyle.color;
  const normalizeKey = (value: string | null | undefined) =>
    value != null ? value.toString().toLowerCase() : null;
  const markerKeys = new Set(
    markerSeriesKeys
      .map((key) => normalizeKey(key))
      .filter((key): key is string => key != null),
  );

  return {
    color: visibleSeries.map((series) => series.color),
    legend: {
      show: false,
    },
    radar: {
      indicator: chartModel.indicators.map((indicator, index) => ({
        ...indicator,
        name: chartModel.dimensions[index]?.name ?? "",
      })),
      radius: "70%",
      startAngle: 90,
      axisName: {
        color: renderingContext.getColor("text-primary"),
        fontFamily: renderingContext.fontFamily,
        fontSize,
        // Wrap long labels instead of letting them overflow/crop
        formatter: (value: string) => `{n|${value}}`,
        rich: {
          n: {
            width: 160, // wrap width in pixels; adjust if needed
            overflow: "break",
            lineHeight: Math.round(fontSize * 1.2),
          },
        },
      },
      axisLine: {
        lineStyle: {
          color: splitLineColor,
          opacity: 0.4,
        },
      },
      splitNumber: 4,
      splitLine: {
        lineStyle: {
          color: splitLineColor,
          opacity: 0.25,
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          opacity: 0.03,
        },
      },
    },
    series: [
      {
        type: "radar",
        name: "radar",
        emphasis: {
          focus: "series",
        },
        symbol: showMarkers ? "circle" : "none",
        symbolSize: showMarkers ? 5 : 0,
        showSymbol: showMarkers,
        showAllSymbol: showMarkers ? "auto" : false,
        lineStyle: {
          width: 2,
        },
        areaStyle: {
          opacity: 0.12,
        },
        animationDuration: 300,
        data: visibleSeries.map((series) =>
          getSeriesData(
            series,
            showMarkers &&
              (markerSeriesKeys.length === 0 ||
                markerKeys.has(normalizeKey(series.key)) ||
                markerKeys.has(normalizeKey(series.name))),
            showLabels,
            renderingContext,
            formatters,
          ),
        ),
      },
    ],
  };
};

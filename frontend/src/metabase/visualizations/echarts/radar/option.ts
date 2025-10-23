import type { RenderingContext } from "metabase/visualizations/types";

import type { RadarChartFormatters } from "./format";
import type { RadarChartModel, RadarSeriesModel } from "./model/types";

interface RadarOptionConfig {
  showMarkers: boolean;
  showLabels: boolean;
  markerSeriesKeys: string[];
  formatters: RadarChartFormatters;
  showLegend?: boolean;
  // Optional container size; if provided we compute a pixel radius
  // to avoid clipping long axis labels inside the chart bounds.
  containerSize?: { width: number; height: number };
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
    // Provide nulls for missing values so ECharts can scale points correctly
    // instead of receiving NaN (which may collapse points).
    value: series.values.map((value) => (value == null ? null : value)),
    rawValues: series.rawValues,
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
            const indicatorIndex =
              typeof params?.indicatorIndex === "number"
                ? params.indicatorIndex
                : typeof params?.dimensionIndex === "number"
                  ? params.dimensionIndex
                  : typeof params?.dataIndex === "number"
                    ? params.dataIndex
                    : 0;
            const rawValue = Array.isArray(data?.rawValues)
              ? data.rawValues[indicatorIndex]
              : null;
            return formatters.formatMetric(rawValue, seriesKey);
          },
        }
      : undefined,
  };
};

export const getRadarChartOption = (
  chartModel: RadarChartModel,
  visibleSeries: RadarSeriesModel[],
  renderingContext: RenderingContext,
  {
    showMarkers,
    showLabels,
    markerSeriesKeys,
    formatters,
    showLegend,
    containerSize,
  }: RadarOptionConfig,
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

  // Compute a radius that attempts to keep axis labels within bounds.
  // Fallback to percentage when container size is unknown.
  const AXIS_LABEL_WRAP_PX = 160;
  // Additional outward space to reserve for numeric datapoint labels around the ring
  const DATA_LABEL_MARGIN_PX = showLabels ? Math.max(16, Math.round(fontSize * 1.6)) : 6;
  let computedRadius: number | string = showLegend ? "60%" : "70%";
  if (containerSize && containerSize.width && containerSize.height) {
    const { width, height } = containerSize;
    const halfW = width / 2;
    const halfH = height / 2;
    // Space needed horizontally to accommodate wrapped labels
    const horizMax = Math.max(0, halfW - AXIS_LABEL_WRAP_PX - DATA_LABEL_MARGIN_PX - 12);
    const vertMax = Math.max(0, halfH - Math.round(fontSize * 1.8) - DATA_LABEL_MARGIN_PX);
    const maxByBounds = Math.min(horizMax, vertMax);
    const base = Math.min(width, height) * (showLegend ? 0.4 : 0.45);
    computedRadius = Math.max(30, Math.min(maxByBounds, base));
  }

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
      radius: computedRadius,
      startAngle: 90,
      axisName: {
        color: renderingContext.getColor("text-primary"),
        fontFamily: renderingContext.fontFamily,
        fontSize,
        // Wrap long labels instead of letting them overflow/crop
        formatter: (value: string) => `{n|${value}}`,
        rich: {
          n: {
            width: AXIS_LABEL_WRAP_PX, // wrap width in pixels; adjust if needed
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

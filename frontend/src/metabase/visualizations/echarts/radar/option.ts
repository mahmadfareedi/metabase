import type { RenderingContext } from "metabase/visualizations/types";

import type { RadarChartModel, RadarSeriesModel } from "./model/types";

interface RadarOptionConfig {
  showMarkers: boolean;
  markerSeriesKeys: string[];
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
}

const getSeriesData = (
  series: RadarSeriesModel,
  showMarkers: boolean,
  renderingContext: RenderingContext,
): RadarSeriesDataItem => {
  const shouldShowMarker = showMarkers;
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
  };
};

export const getRadarChartOption = (
  chartModel: RadarChartModel,
  visibleSeries: RadarSeriesModel[],
  renderingContext: RenderingContext,
  { showMarkers, markerSeriesKeys }: RadarOptionConfig,
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
            renderingContext,
          ),
        ),
      },
    ],
  };
};

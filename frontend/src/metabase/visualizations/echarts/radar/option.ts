import type { RenderingContext } from "metabase/visualizations/types";

import type { RadarChartModel, RadarSeriesModel } from "./model/types";

interface RadarSeriesDataItem {
  name: string;
  value: number[];
  rawValues: (number | null)[];
  seriesKey: string;
  itemStyle: {
    color: string;
  };
}

const getSeriesData = (series: RadarSeriesModel): RadarSeriesDataItem => {
  return {
    name: series.name,
    value: series.values.map((value) => (value == null ? Number.NaN : value)),
    rawValues: series.values,
    seriesKey: series.key,
    itemStyle: {
      color: series.color,
    },
  };
};

export const getRadarChartOption = (
  chartModel: RadarChartModel,
  visibleSeries: RadarSeriesModel[],
  renderingContext: RenderingContext,
) => {
  const fontSize = renderingContext.theme.cartesian.label.fontSize;
  const splitLineColor =
    renderingContext.theme.cartesian.splitLine.lineStyle.color;

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
        color: splitLineColor,
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
        symbol: "circle",
        symbolSize: 4,
        lineStyle: {
          width: 2,
        },
        areaStyle: {
          opacity: 0.12,
        },
        animationDuration: 300,
        data: visibleSeries.map(getSeriesData),
      },
    ],
  };
};

import type { TooltipOption } from "echarts/types/dist/shared";

import { reactNodeToHtmlString } from "metabase/lib/react-to-html";
import { EChartsTooltip } from "metabase/visualizations/components/ChartTooltip/EChartsTooltip";
import {
  getMarkerColorClass,
  getTooltipBaseOption,
} from "metabase/visualizations/echarts/tooltip";

import type { RadarChartFormatters } from "./format";
import type { RadarChartModel, RadarSeriesModel } from "./model/types";

interface RadarTooltipProps {
  series: RadarSeriesModel;
  chartModel: RadarChartModel;
  rawValues: (number | null)[];
  formatters: RadarChartFormatters;
}

const RadarTooltip = ({
  series,
  chartModel,
  rawValues,
  formatters,
}: RadarTooltipProps) => {
  if (chartModel.dimensions.length === 0) {
    return null;
  }

  const [firstDimension, ...restDimensions] = chartModel.dimensions;
  const markerColorClass = getMarkerColorClass(series.color);

  const firstValue = rawValues[0] ?? null;
  const rows = [
    {
      key: `${series.key}-0`,
      markerColorClass,
      name: firstDimension?.name ?? "",
      values: [formatters.formatMetric(firstValue, series.key)],
    },
    ...restDimensions.map((dimension, index) => {
      const value = rawValues[index + 1] ?? null;
      return {
        key: `${series.key}-${index + 1}`,
        name: dimension.name,
        values: [formatters.formatMetric(value, series.key)],
        isSecondary: true,
      };
    }),
  ];

  return <EChartsTooltip header={series.name} rows={rows} />;
};

export const getTooltipOption = (
  containerRef: React.RefObject<HTMLDivElement>,
  chartModel: RadarChartModel,
  formatters: RadarChartFormatters,
): TooltipOption => {
  return {
    ...getTooltipBaseOption(containerRef),
    trigger: "item",
    formatter: (params) => {
      if (Array.isArray(params)) {
        return "";
      }

      const data = params.data as {
        rawValues?: (number | null)[];
        seriesKey?: string;
      };

      if (!data?.seriesKey) {
        return "";
      }

      const series =
        chartModel.series.find((item) => item.key === data.seriesKey) ?? null;

      if (!series) {
        return "";
      }

      return reactNodeToHtmlString(
        <RadarTooltip
          series={series}
          chartModel={chartModel}
          rawValues={data.rawValues ?? []}
          formatters={formatters}
        />,
      );
    },
  };
};

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

const _RadarTooltip = ({
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
  visibleSeriesKeys?: string[],
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

      // Determine which indicator/dimension point is hovered
      const indicatorIndex =
        typeof (params as any)?.indicatorIndex === "number"
          ? (params as any).indicatorIndex
          : typeof (params as any)?.dimensionIndex === "number"
            ? (params as any).dimensionIndex
            : typeof (params as any)?.dataIndex === "number"
              ? (params as any).dataIndex
              : 0;

      const dim = chartModel.dimensions[indicatorIndex];

      // Build a comparison tooltip across series for the hovered dimension.
      const allowed = new Set(
        (visibleSeriesKeys ?? chartModel.series.map((s) => s.key)).map((k) =>
          k.toString(),
        ),
      );

      const rows = chartModel.series
        .filter((s) => allowed.has(s.key))
        .map((s) => {
          const v = s.values[indicatorIndex] ?? null;
          return {
            key: `${s.key}-${indicatorIndex}`,
            markerColorClass: getMarkerColorClass(s.color),
            name: s.name,
            values: [
              formatters.formatMetric(typeof v === "number" ? v : null, s.key),
            ],
            isFocused: s.key === series.key,
          };
        });

      return reactNodeToHtmlString(
        <EChartsTooltip header={dim?.name ?? ""} rows={rows} />,
      );
    },
  };
};

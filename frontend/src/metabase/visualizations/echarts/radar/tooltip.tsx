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
  _visibleSeriesKeys?: string[],
): TooltipOption => {
  return {
    ...getTooltipBaseOption(containerRef),
    // Use item trigger (radar supports series item hover); show all dimension
    // values for the hovered series so users always see numeric values.
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

      // Prefer values from params; fall back to our model values
      const p: any = params;
      const valuesArr: (number | null)[] = Array.isArray(p.value)
        ? (p.value as (number | null)[])
        : Array.isArray(data?.rawValues)
          ? (data.rawValues as (number | null)[])
          : series.values;

      const markerColorClass = getMarkerColorClass(series.color);
      const rows = chartModel.dimensions.map((dim, i) => ({
        key: `${series.key}-${i}`,
        markerColorClass: i === 0 ? markerColorClass : undefined,
        name: dim?.name ?? "",
        values: [
          formatters.formatMetric(
            typeof valuesArr[i] === "number" ? (valuesArr[i] as number) : null,
            series.key,
          ),
        ],
        isSecondary: i !== 0,
      }));

      return reactNodeToHtmlString(
        <EChartsTooltip header={series.name} rows={rows} />,
      );
    },
  };
};

import { NULL_DISPLAY_VALUE } from "metabase/lib/constants";
import { formatValue } from "metabase/lib/formatting";
import type {
  ColumnSettings,
  ComputedVisualizationSettings,
  RemappingHydratedDatasetColumn,
} from "metabase/visualizations/types";

import type { RadarChartModel } from "./model/types";

export interface RadarChartFormatters {
  formatMetric: (value: number | null, seriesKey: string) => string;
}

const getMetricFormatter = (
  columnSettings: ColumnSettings | undefined,
  column: RemappingHydratedDatasetColumn,
) => {
  return (value: number | null) => {
    if (value == null) {
      return NULL_DISPLAY_VALUE;
    }

    const formatted = formatValue(value, {
      ...(columnSettings ?? {}),
      column,
      jsx: false,
    });

    return formatted == null ? NULL_DISPLAY_VALUE : String(formatted);
  };
};

export const getRadarChartFormatters = (
  chartModel: RadarChartModel,
  settings: ComputedVisualizationSettings,
): RadarChartFormatters => {
  const metricFormatters = new Map<
    string,
    ReturnType<typeof getMetricFormatter>
  >();

  chartModel.series.forEach((seriesModel) => {
    const column = seriesModel.metricColumn;
    const columnSettings = settings.column?.(column);
    metricFormatters.set(
      seriesModel.key,
      getMetricFormatter(columnSettings, column),
    );
  });

  const formatMetric = (value: number | null, seriesKey: string) => {
    const formatter = metricFormatters.get(seriesKey);
    if (!formatter) {
      return value == null ? NULL_DISPLAY_VALUE : String(value);
    }

    return formatter(value);
  };

  return {
    formatMetric,
  };
};

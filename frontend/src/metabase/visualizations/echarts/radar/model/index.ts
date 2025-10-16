import { formatValue } from "metabase/lib/formatting";
import { formatNullable } from "metabase/lib/formatting/nullable";
import { isNotNull } from "metabase/lib/types";
import { assertMultiMetricColumns } from "metabase/visualizations/lib/graph/columns";
import {
  getGroupedDataset,
  trimData,
} from "metabase/visualizations/shared/utils/data";
import { getTwoDimensionalChartSeries } from "metabase/visualizations/shared/utils/series";
import type {
  ComputedVisualizationSettings,
  RemappingHydratedDatasetColumn,
} from "metabase/visualizations/types";
import type { DatasetColumn, RawSeries, RowValue } from "metabase-types/api";

import type { RadarChartModel, RadarIndicator } from "./types";

const MAX_DIMENSIONS = 50;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const formatColumnValue = (value: RowValue, column: DatasetColumn) => {
  if (value == null) {
    return formatNullable(value);
  }

  const formatted = formatValue(value, { column, jsx: false });
  return formatted == null ? "" : String(formatted);
};

const extendRange = (min: number, max: number): RadarIndicator => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }

  if (min === max) {
    if (max === 0) {
      return { min: 0, max: 1 };
    }

    if (max > 0) {
      return { min: 0, max: max * 1.1 };
    }

    return { min: max * 1.1, max: 0 };
  }

  const span = max - min;
  const padding = span === 0 ? Math.max(Math.abs(max), 1) * 0.1 : span * 0.1;
  return {
    min: min - padding,
    max: max + padding,
  };
};

const getAxisIndicators = (
  valuesBySeries: (number | null)[][],
  dimensionNames: string[],
): RadarIndicator[] => {
  return dimensionNames.map((_, index) => {
    const values = valuesBySeries
      .map((seriesValues) => seriesValues[index])
      .filter(isNotNull);

    if (values.length === 0) {
      return { min: 0, max: 1 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    return extendRange(min, max);
  });
};

export const getRadarChartModel = (
  rawSeries: RawSeries,
  settings: ComputedVisualizationSettings,
): RadarChartModel => {
  const [{ data }] = rawSeries;

  if (!data) {
    throw new Error("Expected dataset for radar chart");
  }

  const columnFormatter = (value: RowValue, column: DatasetColumn) =>
    formatColumnValue(value, column);

  const { chartColumns, series, seriesColors } = getTwoDimensionalChartSeries(
    data,
    settings,
    columnFormatter,
  );

  const columns = assertMultiMetricColumns(chartColumns);

  const groupedDataset = getGroupedDataset(
    data.rows,
    columns,
    settings,
    columnFormatter,
  );

  const trimmedDatasetBase =
    settings["graph.max_categories_enabled"] && settings["graph.max_categories"]
      ? trimData(groupedDataset, settings["graph.max_categories"])
      : groupedDataset;

  const trimmedDataset = trimmedDatasetBase.slice(0, MAX_DIMENSIONS);

  const dimensions = trimmedDataset.map((datum, index) => ({
    index,
    name: columnFormatter(datum.dimensionValue, columns.dimension.column),
    rawValue: datum.dimensionValue,
    rawRows: datum.rawRows,
  }));

  const seriesModels = series.map((seriesModel) => {
    const values = trimmedDataset.map((datum) =>
      toNumber(seriesModel.xAccessor(datum)),
    );

    const metricColumn = seriesModel.seriesInfo?.metricColumn;

    if (!metricColumn) {
      throw new Error("Missing metric column for radar series");
    }

    return {
      key: seriesModel.seriesKey,
      name: seriesModel.seriesName,
      color: seriesColors[seriesModel.seriesKey],
      values,
      metricColumn,
    };
  });

  const indicators = getAxisIndicators(
    seriesModels.map((seriesModel) => seriesModel.values),
    dimensions.map((dimension) => dimension.name),
  );

  return {
    dimensionColumn: columns.dimension.column as RemappingHydratedDatasetColumn,
    metrics: columns.metrics.map(
      (metric) => metric.column as RemappingHydratedDatasetColumn,
    ),
    dimensions,
    series: seriesModels,
    indicators,
  };
};

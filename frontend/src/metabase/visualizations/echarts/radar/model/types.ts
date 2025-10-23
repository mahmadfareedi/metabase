import type { RemappingHydratedDatasetColumn } from "metabase/visualizations/types";
import type { RowValue, RowValues } from "metabase-types/api";

export interface RadarDimension {
  index: number;
  name: string;
  rawValue: RowValue;
  rawRows: RowValues[];
}

export interface RadarIndicator {
  name: string;
  min: number;
  max: number;
}

export interface RadarSeriesModel {
  key: string;
  name: string;
  color: string;
  // Transformed values used for drawing (may be log-scaled).
  values: (number | null)[];
  // Raw numeric values (unscaled). Used for labels/tooltips.
  rawValues: (number | null)[];
  metricColumn: RemappingHydratedDatasetColumn;
}

export interface RadarChartModel {
  dimensionColumn: RemappingHydratedDatasetColumn;
  metrics: RemappingHydratedDatasetColumn[];
  dimensions: RadarDimension[];
  series: RadarSeriesModel[];
  indicators: RadarIndicator[];
}

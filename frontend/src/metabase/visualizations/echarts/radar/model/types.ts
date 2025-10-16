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
  values: (number | null)[];
  metricColumn: RemappingHydratedDatasetColumn;
}

export interface RadarChartModel {
  dimensionColumn: RemappingHydratedDatasetColumn;
  metrics: RemappingHydratedDatasetColumn[];
  dimensions: RadarDimension[];
  series: RadarSeriesModel[];
  indicators: RadarIndicator[];
}

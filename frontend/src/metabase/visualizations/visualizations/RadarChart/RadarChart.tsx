import type { EChartsType } from "echarts/core";
import { type MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { useSet } from "react-use";

import { isNotNull } from "metabase/lib/types";
import { extractRemappings } from "metabase/visualizations";
import ChartWithLegend from "metabase/visualizations/components/ChartWithLegend";
import { ResponsiveEChartsRenderer } from "metabase/visualizations/components/EChartsRenderer";
import { getRadarChartFormatters } from "metabase/visualizations/echarts/radar/format";
import { getRadarChartModel } from "metabase/visualizations/echarts/radar/model";
import { getRadarChartOption } from "metabase/visualizations/echarts/radar/option";
import { getTooltipOption } from "metabase/visualizations/echarts/radar/tooltip";
import {
  useCloseTooltipOnScroll,
  useInjectSeriesColorsClasses,
} from "metabase/visualizations/echarts/tooltip";
import { useBrowserRenderingContext } from "metabase/visualizations/hooks/use-browser-rendering-context";
import type { VisualizationProps } from "metabase/visualizations/types";
import { useTooltipMouseLeave } from "metabase/visualizations/visualizations/CartesianChart/use-tooltip-mouse-leave";

import { RADAR_CHART_DEFINITION } from "./chart-definition";

export function RadarChart(props: VisualizationProps) {
  const {
    rawSeries,
    settings,
    fontFamily,
    isDashboard,
    isFullscreen,
    hovered,
    onHoverChange,
    className,
    gridSize,
    isDocument,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType>();

  const [hiddenSeries, { toggle: toggleSeriesVisibility }] = useSet<string>();

  const rawSeriesWithRemappings = useMemo(
    () => extractRemappings(rawSeries),
    [rawSeries],
  );

  const renderingContext = useBrowserRenderingContext({
    fontFamily,
    isDashboard,
    isFullscreen,
  });

  const chartModel = useMemo(
    () => getRadarChartModel(rawSeriesWithRemappings, settings),
    [rawSeriesWithRemappings, settings],
  );

  const formatters = useMemo(
    () => getRadarChartFormatters(chartModel, settings),
    [chartModel, settings],
  );

  const showDataPoints = Boolean(settings["radar.show_data_points"]);
  const markerSeriesKeys = useMemo(() => {
    const configuredSeries = Array.isArray(settings["radar.data_points_series"])
      ? (settings["radar.data_points_series"] as Array<
          string | null | { value?: unknown }
        >)
      : [];

    return configuredSeries
      .map((value) => {
        if (value == null) {
          return null;
        }
        if (typeof value === "string") {
          return value;
        }
        if (typeof value === "object" && "value" in value) {
          return value.value != null ? String(value.value) : null;
        }
        return String(value);
      })
      .filter((value): value is string => value != null && value !== "");
  }, [settings]);

  const visibleSeries = useMemo(
    () => chartModel.series.filter((series) => !hiddenSeries.has(series.key)),
    [chartModel.series, hiddenSeries],
  );

  // Whether to show the legend. Must be defined before it's used below.
  const showLegend = settings["radar.show_legend"] !== false;

  // Track container size to compute a safe radius that avoids clipping
  const [containerSize, setContainerSize] = useState<
    | { width: number; height: number }
    | undefined
  >(undefined);

  const handleResize = useCallback((width: number, height: number) => {
    setContainerSize({ width, height });
  }, []);

  const option = useMemo(
    () => ({
      ...getRadarChartOption(chartModel, visibleSeries, renderingContext, {
        showMarkers: showDataPoints,
        showLabels: showDataPoints,
        markerSeriesKeys: showDataPoints ? markerSeriesKeys : [],
        formatters,
        showLegend,
        containerSize: containerSize,
      }),
      tooltip: getTooltipOption(
        containerRef,
        chartModel,
        formatters,
        visibleSeries.map((s) => s.key),
      ),
    }),
    [
      chartModel,
      visibleSeries,
      renderingContext,
      formatters,
      showDataPoints,
      markerSeriesKeys,
      showLegend,
      containerSize,
    ],
  );

  const legendTitles = chartModel.series.map((series) => [series.name]);
  const legendColors = chartModel.series.map((series) => series.color);
  const legendHiddenIndices = chartModel.series
    .map((series, index) => (hiddenSeries.has(series.key) ? index : null))
    .filter(isNotNull);

  const handleInit = useCallback((chart: EChartsType) => {
    chartRef.current = chart;
  }, []);

  const handleToggleSeriesVisibility = useCallback(
    (_event: MouseEvent, seriesIndex: number) => {
      const series = chartModel.series[seriesIndex];
      if (!series) {
        return;
      }
      const willShow = hiddenSeries.has(series.key);
      const visibleCount = chartModel.series.length - hiddenSeries.size;
      if (visibleCount > 1 || willShow) {
        toggleSeriesVisibility(series.key);
      }
    },
    [chartModel.series, hiddenSeries, toggleSeriesVisibility],
  );

  useCloseTooltipOnScroll(chartRef);
  useTooltipMouseLeave(chartRef, onHoverChange, containerRef);

  const radarColorsCss = useInjectSeriesColorsClasses(
    chartModel.series.map((series) => series.color),
  );

  return (
    <>
      <ChartWithLegend
        legendTitles={legendTitles}
        legendColors={legendColors}
        legendHiddenIndices={legendHiddenIndices}
        showLegend={showLegend}
        hovered={hovered}
        onHoverChange={onHoverChange}
        onToggleSeriesVisibility={handleToggleSeriesVisibility}
        className={className}
        gridSize={gridSize}
        isDashboard={isDashboard}
        isDocument={isDocument}
      >
        <ResponsiveEChartsRenderer
          ref={containerRef}
          option={option}
          onInit={handleInit}
          onResize={handleResize}
        />
      </ChartWithLegend>
      {radarColorsCss}
    </>
  );
}

Object.assign(RadarChart, RADAR_CHART_DEFINITION);

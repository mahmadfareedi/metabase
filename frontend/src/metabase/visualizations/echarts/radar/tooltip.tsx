import type { TooltipOption } from "echarts/types/dist/shared";

import { reactNodeToHtmlString } from "metabase/lib/react-to-html";
import { EChartsTooltip } from "metabase/visualizations/components/ChartTooltip/EChartsTooltip";
import {
  getMarkerColorClass,
  getTooltipBaseOption,
  getTooltipPositionFn,
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
  // Keep track of last mouse point so we can infer indicator index
  // when ECharts doesn't provide it for radar item tooltips.
  let lastPoint: [number, number] | null = null;
  // Cache detected axis label centers (relative to container)
  let labelCenters: Array<[number, number]> | null = null;

  const computeLabelCenters = (): Array<[number, number]> | null => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const centers: Array<[number, number]> = [];
    const names = chartModel.dimensions.map(d => String(d.name));
    // Query all text nodes within this container's SVG
    const texts = Array.from(el.querySelectorAll('text')) as SVGTextElement[];
    if (texts.length === 0) return null;
    for (const name of names) {
      // Find all matching labels with exact text
      const candidates = texts.filter(t => (t.textContent || '').trim() === name);
      if (candidates.length === 0) {
        return null; // bail out; use angle fallback
      }
      // Pick the one farthest from chart center to avoid numeric point labels
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      let best: [number, number] | null = null;
      let bestDist = -1;
      for (const t of candidates) {
        const r = t.getBoundingClientRect();
        const x = r.left - rect.left + r.width / 2;
        const y = r.top - rect.top + r.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > bestDist) {
          bestDist = d2;
          best = [x, y];
        }
      }
      if (best == null) return null;
      centers.push(best);
    }
    return centers;
  };

  const basePos = getTooltipPositionFn(containerRef);

  return {
    ...getTooltipBaseOption(containerRef),
    position: (pt, params, dom, rect, size) => {
      lastPoint = pt as [number, number];
      return basePos(pt as [number, number], params as any, dom as any, rect as any, size as any);
    },
    // Use item trigger for radar (supported reliably).
    trigger: "item",
    triggerOn: "mousemove|click",
    formatter: (param) => {
      const p: any = Array.isArray(param) ? param[0] : param;
      // Best-effort: try to get the hovered indicator index if ECharts provides it
      // (available when hovering symbols), otherwise default to 0 so the tooltip
      // still renders rather than not showing at all.
      let indicatorIndex: number | null =
        typeof p?.indicatorIndex === "number"
          ? p.indicatorIndex
          : typeof p?.dimensionIndex === "number"
            ? p.dimensionIndex
            : null;

      // If we don't have an index, estimate from the last mouse position.
      if (indicatorIndex == null && lastPoint && containerRef.current) {
        // Try nearest axis label center first (most reliable)
        if (!labelCenters || labelCenters.length !== chartModel.dimensions.length) {
          labelCenters = computeLabelCenters();
        }
        if (labelCenters) {
          const [mx, my] = lastPoint;
          let bestIdx = 0;
          let bestD2 = Infinity;
          for (let i = 0; i < labelCenters.length; i++) {
            const [x, y] = labelCenters[i];
            const dx = mx - x;
            const dy = my - y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) {
              bestD2 = d2;
              bestIdx = i;
            }
          }
          indicatorIndex = bestIdx;
        }
      }
      // Fallback to geometric angle rounding if labels were not detected
      if (indicatorIndex == null && lastPoint && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const cx = width / 2;
        const cy = height / 2;
        const [mx, my] = lastPoint;
        const dx = mx - cx;
        const dy = my - cy;
        // Compute CCW angle from +x to mouse point (math orientation)
        let degCCW = (Math.atan2(-dy, dx) * 180) / Math.PI;
        if (degCCW < 0) degCCW += 360;

        const startAngle = 90; // our radar option startAngle (deg, CCW)
        const stepCW = 360 / Math.max(1, chartModel.dimensions.length);
        // Nearest-axis rounding: i = round((startAngle - angleCCW)/step) mod N
        const n = chartModel.dimensions.length;
        let raw = (startAngle - degCCW) / stepCW;
        // normalize to [0,n)
        raw = ((raw % n) + n) % n;
        indicatorIndex = Math.round(raw) % n;
      }
      if (indicatorIndex == null) indicatorIndex = 0;

      const visibleKeys = (visibleSeriesKeys && visibleSeriesKeys.length > 0)
        ? visibleSeriesKeys
        : chartModel.series.map((s) => s.key);

      const rows = visibleKeys
        .map((key) => chartModel.series.find((s) => s.key === key))
        .filter((s): s is RadarSeriesModel => !!s)
        .map((s) => {
          // Always show raw values in tooltip
          const arr: (number | null)[] = s.rawValues;
          const value =
            typeof arr[indicatorIndex] === "number"
              ? (arr[indicatorIndex] as number)
              : null;
          return {
            key: `${s.key}-${indicatorIndex}`,
            markerColorClass: getMarkerColorClass(s.color),
            name: s.name,
            values: [formatters.formatMetric(value, s.key)],
            isFocused: p?.seriesName === s.name,
          };
        });

      const header = chartModel.dimensions[indicatorIndex]?.name ?? p?.name ?? "";
      return reactNodeToHtmlString(<EChartsTooltip header={header} rows={rows} />);
    },
  };
};

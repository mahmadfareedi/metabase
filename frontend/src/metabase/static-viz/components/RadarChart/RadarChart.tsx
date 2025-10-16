import { init } from "echarts/core";

import type { StaticChartProps } from "metabase/static-viz/components/StaticVisualization";
import { sanitizeSvgForBatik } from "metabase/static-viz/lib/svg";
import { registerEChartsModules } from "metabase/visualizations/echarts";
import { getRadarChartModel } from "metabase/visualizations/echarts/radar/model";
import { getRadarChartOption } from "metabase/visualizations/echarts/radar/option";

import Watermark from "../../watermark.svg?component";

const WIDTH = 520;
const HEIGHT = 360;

registerEChartsModules();

export const RadarChart = ({
  rawSeries,
  settings,
  renderingContext,
  width = WIDTH,
  height = HEIGHT,
  isStorybook = false,
  hasDevWatermark = false,
}: StaticChartProps) => {
  const chart = init(null, null, {
    renderer: "svg",
    ssr: true,
    width,
    height,
  });

  const chartModel = getRadarChartModel(rawSeries, settings);
  const option = getRadarChartOption(
    chartModel,
    chartModel.series,
    renderingContext,
  );

  if (settings["radar.show_legend"] !== false && chartModel.series.length > 0) {
    option.legend = {
      show: true,
      bottom: 0,
      textStyle: {
        fontFamily: renderingContext.fontFamily,
      },
    };
  } else {
    option.legend = {
      show: false,
    };
  }

  option.tooltip = {
    show: false,
  };

  chart.setOption(option);

  const chartSvg = sanitizeSvgForBatik(chart.renderToSVGString(), isStorybook);

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}>
      <g dangerouslySetInnerHTML={{ __html: chartSvg }} />
      {hasDevWatermark && (
        <Watermark
          x="0"
          y="0"
          height={height}
          width={width}
          preserveAspectRatio="xMinYMin slice"
        />
      )}
    </svg>
  );
};

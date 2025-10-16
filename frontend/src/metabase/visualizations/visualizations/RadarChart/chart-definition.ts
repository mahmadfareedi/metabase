import { t } from "ttag";

import {
  ChartSettingsError,
  MinRowsError,
} from "metabase/visualizations/lib/errors";
import { hasValidColumnsSelected } from "metabase/visualizations/lib/graph/columns";
import { GRAPH_DATA_SETTINGS } from "metabase/visualizations/lib/settings/graph";
import {
  getDefaultSize,
  getMinSize,
} from "metabase/visualizations/shared/utils/sizes";
import type {
  VisualizationDefinition,
  VisualizationSettingsDefinitions,
} from "metabase/visualizations/types";

const RADAR_DATA_SETTINGS: VisualizationSettingsDefinitions = {
  ...GRAPH_DATA_SETTINGS,
  "graph.dimensions": {
    ...GRAPH_DATA_SETTINGS["graph.dimensions"],
    get title() {
      return t`Dimension`;
    },
  },
  "graph.metrics": {
    ...GRAPH_DATA_SETTINGS["graph.metrics"],
    get title() {
      return t`Metrics`;
    },
  },
};

export const RADAR_CHART_DEFINITION: VisualizationDefinition = {
  getUiName: () => t`Radar`,
  identifier: "radar",
  iconName: "radar",
  // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
  noun: t`radar chart`,
  minSize: getMinSize("radar"),
  defaultSize: getDefaultSize("radar"),
  supportsVisualizer: true,
  maxDimensionsSupported: 1,
  maxMetricsSupported: 5,
  checkRenderable: ([{ data }], settings) => {
    if (!data) {
      throw new MinRowsError(3, 0);
    }

    if (!hasValidColumnsSelected(settings, data)) {
      throw new ChartSettingsError(t`Which columns do you want to use?`, {
        section: `Data`,
      });
    }

    const rowCount = data.rows.length;
    if (rowCount < 3) {
      throw new MinRowsError(3, rowCount);
    }
  },
  hasEmptyState: true,
  settings: {
    ...RADAR_DATA_SETTINGS,
    "radar.show_legend": {
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
      section: t`Display`,
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
      title: t`Show legend`,
      widget: "toggle",
      default: true,
      inline: true,
    },
    "radar.show_data_points": {
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
      section: t`Display`,
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
      title: t`Show data points`,
      widget: "toggle",
      default: false,
      inline: true,
    },
    "radar.data_points_series": {
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
      section: t`Display`,
      // eslint-disable-next-line ttag/no-module-declaration -- see metabase#55045
      title: t`Data points metrics`,
      widget: "multiselect",
      getHidden: (_series, settings) =>
        settings["radar.show_data_points"] !== true,
      getProps: (rawSeries, settings) => {
        const [{ data } = { data: undefined }] = rawSeries;
        const columns = data?.cols ?? [];
        const metricNames = (settings["graph.metrics"] ?? []).filter(
          (name: string | null): name is string => name != null,
        );

        const options = metricNames.map((name) => {
          const column = columns.find((col) => col.name === name);
          return {
            value: name,
            label: column?.display_name ?? name,
          };
        });

        return { options };
      },
      readDependencies: ["graph.metrics"],
      default: [],
    },
  } as VisualizationSettingsDefinitions,
};

---
title: Radar chart
---

# Radar chart

Radar charts (sometimes called spider or web charts) let you compare how multiple metrics perform across a shared set of categories. Each category becomes an axis that radiates from the center of the chart, and each metric is drawn as a polygon that connects the values for that metric across the axes.

Use a radar chart when you have a single categorical dimension&mdash;like product line, region, or team&mdash;and a handful of related metrics that you want to compare side by side. The chart makes it easy to spot strengths and weaknesses for each metric relative to the others.

## Data requirements

To plot a radar chart, pick:

- **Dimension** – one column that defines the categories you want to compare.
- **Metrics** – one or more numeric columns. Metabase will draw one polygon for each metric you select.

If your results include a lot of categories, consider limiting the number of rows with a filter or by adjusting the **Max number of categories** setting so that the chart stays readable.

## Customizing the chart

Open the visualization settings to:

- Toggle the legend on or off.
- Reorder or hide metrics using the **Series order** settings.
- Control formatting for individual columns so that tooltips display the values the way you expect.

In dashboards you can also hide metrics directly from the legend; at least one metric must remain visible for the chart to render.

## Tips

- Radar charts work best with a small number of categories (roughly 3–12). Too many categories crowd the axes and make the polygons hard to read.
- Because every metric shares the same scale, make sure you are comparing metrics with similar magnitudes and units.
- If you only need to compare a single metric across categories, a row or bar chart may communicate the data more clearly.

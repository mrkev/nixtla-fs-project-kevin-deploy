import { ChartDataset, ChartOptions } from "chart.js";
import randomcolor from "randomcolor";
import { DateEntry } from "./data/DateEntry";

export const chartDisplayOptions = (title: string): ChartOptions<"line"> => ({
  responsive: true,
  font: {
    family: "monospace",
  },
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        font: {
          family: "monospace",
        },
      },
    },
    title: {
      display: true,
      text: title,
      font: {
        family: "monospace",
      },
    },
  },
  scales: {
    x: {
      type: "time",
      // suggestedMin: new Date("2020/1/1").getTime(),
    },
  },
});

export type LineDataset = ChartDataset<"line", { x: number; y: number }[]>;
export function datasetOfEntries(
  label: string,
  data: DateEntry[]
): LineDataset {
  return {
    label: label,
    data: data.map((datum) => ({
      x: datum.date,
      y: datum.count,
    })),
    borderColor: randomcolor({ seed: label }),
    backgroundColor: randomcolor({ seed: label }),
  };
}

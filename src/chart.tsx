import { ChartDataset, ChartOptions } from "chart.js";
import randomcolor from "randomcolor";
import { LineDataset } from "./chart";
import { DateEntry } from "./data/DateEntry";
import { LineDataset } from "./chart";
import { DateEntry } from "./data/DateEntry";
import { Subject } from "./state/subject";

export const chartDisplayOptions = (title: string): ChartOptions<"line"> => ({
  responsive: true,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      text: title,
    },
  },
  scales: {
    x: {
      type: "time",
      suggestedMin: new Date("2020/1/1").getTime(),
    },
  },
});
export type LineDataset = ChartDataset<"line", { x: number; y: number }[]>;
export async function datasetOfEntries(
  label: string,
  data: DateEntry[]
): Promise<LineDataset> {
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
export function datasetId(
  subject: Subject,
  dataset: "stars" | "futureStars" | "downloads" | "futureDownloads"
) {
  return `${subject.kind}.${subject.id}.${dataset}`;
}

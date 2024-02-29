import { LineDataset, datasetOfEntries } from "../chart";
import api from "../common/api";
import { DateEntry } from "../data/DateEntry";
import { GH_TOKEN } from "../data/github";
import { predictDays } from "../data/nixtla";
import { exhaustive } from "../utils";

export class Subject {
  public stars: Promise<DateEntry[]>;
  public futureStars: Promise<DateEntry[]>;
  public downloads: Promise<DateEntry[]>;
  public futureDownloads: Promise<DateEntry[]>;
  public chartData: SubjectChartDataset;

  constructor(
    public readonly id: string,
    public readonly kind: "repo" | "pacakge" | "org"
  ) {
    this.stars = this.loadStars();
    this.downloads = this.loadDownloads();
    this.futureStars = this.stars.then((stars) => predictDays(90, stars));
    this.futureDownloads = this.downloads.then((dls) => predictDays(90, dls));
    this.chartData = new SubjectChartDataset(this);
  }

  private async loadStars(): Promise<DateEntry[]> {
    switch (this.kind) {
      case "org":
      case "pacakge":
        break;
      case "repo": {
        const stars = await api.getRepoStarRecords(this.id, GH_TOKEN, 10);
        return stars;
      }
      default:
        exhaustive(this.kind);
    }
    throw new Error("TODO");
  }

  private async loadDownloads(): Promise<DateEntry[]> {
    switch (this.kind) {
      case "org":
      case "pacakge":
        break;
      case "repo": {
        const stars = await api.getRepoStarRecords(this.id, GH_TOKEN, 10);
        return stars;
      }
      default:
        exhaustive(this.kind);
    }
    throw new Error("TODO");
  }
}

export class SubjectChartDataset {
  public stars: Promise<LineDataset>;
  public futureStars: Promise<LineDataset>;
  public downloads: Promise<LineDataset>;
  public futureDownloads: Promise<LineDataset>;

  constructor(subject: Subject) {
    this.stars = subject.stars.then((stars) =>
      datasetOfEntries(`${subject.id}`, stars)
    );
    this.downloads = subject.downloads.then((dls) =>
      datasetOfEntries(`${subject.id}`, dls)
    );
    this.futureStars = subject.futureStars.then((stars) =>
      datasetOfEntries(`${subject.id} projections`, stars)
    );
    this.futureDownloads = subject.futureDownloads.then((dls) =>
      datasetOfEntries(`${subject.id} projections`, dls)
    );
  }
}

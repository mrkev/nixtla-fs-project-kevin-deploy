import { getRepoStarRecords } from "../common/api";
import { DateEntry } from "../data/DateEntry";
import { fetchPepyDownloadData } from "../data/pepy";
import { PackageResponse, infoForPackage } from "../data/pypi";
import { ReactiveValue } from "./ReactiveValue";

export class PyPackage {
  public readonly repo: readonly [string, string] | null = null;
  public readonly currentStars = ReactiveValue.of<number | null>(null);

  static async fetch(pkg: string) {
    const info = await infoForPackage(pkg);
    return new PyPackage(pkg, info);
  }

  private constructor(
    public readonly id: string,
    public readonly pypiInfo: PackageResponse
  ) {
    const repoURL =
      this.pypiInfo.info.project_urls["Source"] ??
      this.pypiInfo.info.project_urls["Homepage"];
    if (typeof repoURL !== "string") {
      console.warn("no source");
      return;
    }

    const url = new URL(repoURL);
    if (url.hostname !== "github.com") {
      console.warn("not github");
      return;
    }

    const repoRegex = new RegExp("[^/]+/[^/]+", "gi");
    const repoResult = repoRegex.exec(url.pathname);
    if (repoResult == null) {
      console.warn("no repo");
      return;
    }

    const [org, repo] = repoResult[0].split("/");
    console.log(repoResult[0]);
    this.repo = [org, repo];
  }

  get org() {
    return this.repo?.[0] ?? null;
  }

  public async loadStars(): Promise<DateEntry[] | Error> {
    const repoURL =
      this.pypiInfo.info.project_urls["Source"] ??
      this.pypiInfo.info.project_urls["Homepage"];
    if (typeof repoURL !== "string") {
      return new Error("no source");
    }

    const url = new URL(repoURL);
    if (url.hostname !== "github.com") {
      return new Error("not github");
    }

    const repoRegex = new RegExp("[^/]+/[^/]+", "gi");
    const repoResult = repoRegex.exec(url.pathname);
    if (repoResult == null) {
      return new Error("no repo");
    }

    try {
      const repo = repoResult[0];
      const stars = await getRepoStarRecords(repo, 10);
      const total = stars[stars.length - 1].count;
      this.currentStars.set(total);
      return stars;
    } catch (e) {
      return e as Error;
    }
  }

  public async loadDownloads() {
    const downloads = fetchPepyDownloadData(this.id);
    return downloads;
  }
}

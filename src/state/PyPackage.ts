import api from "../common/api";
import { DateEntry } from "../data/DateEntry";
import { GH_TOKEN } from "../data/github";
import { fetchPepyDownloadData } from "../data/pepy";
import { PackageResponse, infoForPackage } from "../data/pypi";

export class PyPackage {
  public readonly repo: string | null = null;
  public readonly org: string | null = null;

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

    this.repo = repoResult[0];
    this.org = this.repo.split("/")[0];
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
      const stars = await api.getRepoStarRecords(repo, GH_TOKEN, 10);
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

import { getRepoStarRecords } from "../data/stars";
import { DateEntry } from "../data/DateEntry";
import { fetchPepyDownloadData } from "../data/pepy";
import { PackageResponse, infoForPackage } from "../data/pypi";
import { ReactiveValue } from "./ReactiveValue";

function repoOfPyPIInfo(
  pypiInfo: PackageResponse
): readonly [string, string] | null {
  const repoURL =
    pypiInfo.info.project_urls["Source"] ??
    pypiInfo.info.project_urls["Homepage"];
  if (typeof repoURL !== "string") {
    console.warn("no source");
    return null;
  }

  const url = new URL(repoURL);
  if (url.hostname !== "github.com") {
    console.warn("not github");
    return null;
  }

  const repoRegex = new RegExp("[^/]+/[^/]+", "gi");
  const repoResult = repoRegex.exec(url.pathname);
  if (repoResult == null) {
    console.warn("no repo");
    return null;
  }

  const [org, repo] = repoResult[0].split("/");
  return [org, repo];
}

export class PyPackage {
  public readonly currentStars = ReactiveValue.of<number | null>(null);

  static async fetch(pkg: string) {
    const pypiInfo = await infoForPackage(pkg);
    const repo = repoOfPyPIInfo(pypiInfo);
    return new PyPackage(pkg, pypiInfo, repo);
  }

  private constructor(
    public readonly id: string,
    public readonly pypiInfo: PackageResponse,
    public readonly repo: readonly [string, string] | null
  ) {}

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

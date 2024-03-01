import { getAllRepos } from "../api2";
import { DateEntry } from "../data/DateEntry";
import { getAggregatedOrgStarCounts } from "../data/github";

export class GhOrg {
  static async fetch(org: string): Promise<GhOrg | Error> {
    const repos = await getAllRepos(org);
    return new GhOrg(org, repos);
  }

  constructor(
    public readonly id: string,
    private readonly repoCounts: {
      name: string;
      stargazers_count: number;
    }[]
  ) {}

  public async loadStars(): Promise<DateEntry[] | Error> {
    const result = await getAggregatedOrgStarCounts(this.id, this.repoCounts);
    return result;
  }
}

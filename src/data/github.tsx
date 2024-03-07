import { getAllRepos } from "./repos";
import { getRepoStarRecords } from "./stars";
import { DateEntry, DateLinkedEntry, extrapolateCounts } from "./DateEntry";

export type GHRepo = `${string}/${string}`;

async function getAllOrgData(
  org: string,
  repoData?: {
    name: string;
    stargazers_count: number;
  }[]
) {
  const repos = repoData ?? (await getAllRepos(org));
  const results = await Promise.all(
    repos.map(async (repo: any) => {
      if (repo.stargazers_count === 0) {
        return { repo: repo.name, starHistory: [] };
      } else {
        return {
          repo: repo.name,
          starHistory: await getRepoStarRecords(repo.name, 10).catch(() => {
            console.log(`error: getting data for ${repo.name}`);
            return [] as DateEntry[];
          }),
        };
      }
    })
  );

  return results;
}

function asLinkedList(entires: DateEntry[]): DateLinkedEntry | null {
  if (entires.length < 1) {
    return null;
  }

  const first: DateLinkedEntry = {
    date: entires[0].date,
    count: entires[0].count,
    next: null,
  };
  let current = first;
  for (let i = 1; i < entires.length; i++) {
    current.next = {
      date: entires[i].date,
      count: entires[i].count,
      next: null,
    };
    current = current.next;
  }

  return first;
}

export async function getAggregatedOrgStarCounts(
  org: string,
  repoData?: {
    name: string;
    stargazers_count: number;
  }[]
): Promise<DateEntry[]> {
  const orgData = await getAllOrgData(org, repoData);
  const allData = orgData.map(({ repo, starHistory }) => ({
    repo,
    // TODO: ensure at least 2?
    starHistory: asLinkedList(starHistory),
  }));

  const datesSet = new Set<number>();
  for (const repo of orgData) {
    for (const entry of repo.starHistory) {
      datesSet.add(entry.date);
    }
  }

  // sort ascending
  const allDates = [...datesSet].sort((a, b) => a - b);

  const repoState = new Map<string, DateLinkedEntry>();
  for (const repo of allData) {
    if (repo.starHistory == null) {
      console.warn("this should never happen, no star history");
      continue;
    }
    repoState.set(repo.repo, repo.starHistory);
  }

  const timeline = Array<{ date: number; count: number }>();
  for (const date of allDates) {
    let total = 0;
    for (const [repo, entry] of repoState.entries()) {
      // assume zero before first point
      if (date < entry.date) {
        continue;
      }
      // no more points, always add this
      if (entry.next == null) {
        total += entry.count;
        continue;
      }

      // stay and extrapolate
      if (date < entry.next.date) {
        total += extrapolateCounts(entry, entry.next, date);
        continue;
      }

      if (date >= entry.next.date) {
        repoState.set(repo, entry.next);
        if (entry.next.next != null) {
          total += extrapolateCounts(entry.next, entry.next.next, date);
        } else {
          total += entry.next.count;
        }
      }
    }
    timeline.push({ date, count: total });
  }

  return timeline;
}

// based off: https://github.com/star-history/star-history

import { getDateString, range } from "../common/utils";
import { DateEntry, ascendingEntrySort } from "./DateEntry";
import { GHRepo } from "./github";

export const DEFAULT_PER_PAGE = 60;
const MAX_NUM_PAGES_STARS = 10;

async function getRepoStargazers(repo: GHRepo, page: number) {
  const url = `/github/repos/${repo}/stargazers?per_page=${DEFAULT_PER_PAGE}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return {
    json: await res.json(),
    headers: Object.fromEntries(res.headers.entries()),
  };
}

async function getRepoStargazersCount(repo: string) {
  const res = await fetch(`/github/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const json = await res.json();
  return json.stargazers_count;
}

function pagesToFetch(totalPages: number) {
  if (totalPages < MAX_NUM_PAGES_STARS) {
    return range(1, totalPages);
  }

  const pageNumbers = new Set<number>();
  range(1, MAX_NUM_PAGES_STARS).map((i) => {
    pageNumbers.add(Math.round((i * totalPages) / MAX_NUM_PAGES_STARS) - 1);
  });

  // always include first page
  if (!pageNumbers.has(1)) {
    pageNumbers.add(1);
  }

  const pagesToRequest = Array.from(pageNumbers).sort((a, b) => a - b);

  return pagesToRequest;
}

export function githubHeadersGetLastPage(headers: Record<string, string>) {
  const headerLinks = headers["link"] ?? "";
  const lastMatch = /next.*&page=(\d*).*last/.exec(headerLinks);
  if (
    lastMatch != null &&
    lastMatch[1] != null &&
    Number.isInteger(Number(lastMatch[1]))
  ) {
    return Number(lastMatch[1]);
  } else {
    return null;
  }
}

export async function getRepoStarRecords(
  repo: GHRepo,
  maxRequestAmount: number
): Promise<DateEntry[]> {
  const firstPage = await getRepoStargazers(repo, 1);
  const headerLinks = firstPage.headers["link"] ?? "";

  let pageCount = 1;
  const lastMatch = /next.*&page=(\d*).*last/.exec(headerLinks);

  if (
    lastMatch != null &&
    lastMatch[1] != null &&
    Number.isInteger(Number(lastMatch[1]))
  ) {
    pageCount = Number(lastMatch[1]);
  }

  if (pageCount === 1 && firstPage?.json?.length === 0) {
    console.warn("no stars");
    return [];
  }

  const requestPages: number[] = pagesToFetch(pageCount);

  const resArray = await Promise.all(
    requestPages.map((page) => {
      return getRepoStargazers(repo, page);
    })
  );

  const starRecordsMap: Map<string, number> = new Map();

  if (requestPages.length < maxRequestAmount) {
    const starRecordsData: {
      starred_at: string;
    }[] = [];
    resArray.map((res) => {
      const { json } = res;
      starRecordsData.push(...json);
    });
    for (let i = 0; i < starRecordsData.length; ) {
      starRecordsMap.set(getDateString(starRecordsData[i].starred_at), i + 1);
      i += Math.floor(starRecordsData.length / maxRequestAmount) || 1;
    }
  } else {
    resArray.map(({ json }, index) => {
      if (json.length > 0) {
        const starRecord = json[0];
        starRecordsMap.set(
          getDateString(starRecord.starred_at),
          DEFAULT_PER_PAGE * (requestPages[index] - 1)
        );
      }
    });
  }

  const starAmount = await getRepoStargazersCount(repo);
  starRecordsMap.set(getDateString(Date.now()), starAmount);

  const starRecords: DateEntry[] = [];

  starRecordsMap.forEach((v, k) => {
    starRecords.push({
      date: new Date(k).getTime(),
      count: v,
    });
  });

  starRecords.sort(ascendingEntrySort);

  return starRecords;
}

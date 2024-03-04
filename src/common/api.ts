// from: https://github.com/star-history/star-history

import axios from "axios";
import { range, getDateString } from "./utils";
import { DateEntry, ascendingEntrySort } from "../data/DateEntry";
import { GH_TOKEN } from "../data/github";

const DEFAULT_PER_PAGE = 30;

async function getRepoStargazers(repo: string, page: number) {
  const url = `https://api.github.com/repos/${repo}/stargazers?per_page=${DEFAULT_PER_PAGE}&page=${page}`;
  return axios.get(url, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      Authorization: `token ${GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

async function getRepoStargazersCount(repo: string) {
  const { data } = await axios.get(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      Authorization: `token ${GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return data.stargazers_count;
}

const MAX_REQ_AMOUNT = 10;
function pagesToFetch(totalPages: number) {
  if (totalPages < MAX_REQ_AMOUNT) {
    return range(1, totalPages);
  }

  const pageNumbers = new Set<number>();
  range(1, MAX_REQ_AMOUNT).map((i) => {
    pageNumbers.add(Math.round((i * totalPages) / MAX_REQ_AMOUNT) - 1);
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
  repo: string,
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

  if (pageCount === 1 && firstPage?.data?.length === 0) {
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
      const { data } = res;
      starRecordsData.push(...data);
    });
    for (let i = 0; i < starRecordsData.length; ) {
      starRecordsMap.set(getDateString(starRecordsData[i].starred_at), i + 1);
      i += Math.floor(starRecordsData.length / maxRequestAmount) || 1;
    }
  } else {
    resArray.map(({ data }, index) => {
      if (data.length > 0) {
        const starRecord = data[0];
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
(window as any).getRepoStarRecords = getRepoStarRecords;

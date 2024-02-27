import {
  CategoryScale,
  ChartData,
  ChartDataset,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
import randomcolor from "randomcolor";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "./App.css";
import { getAllRepos } from "./api2";
import api, { StarEntry } from "./common/api";

const TOKEN = import.meta.env.VITE_GH_TOKEN;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const options: ChartOptions<"line"> = {
  responsive: true,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      text: "Chart.js Line Chart",
    },
  },
  scales: {
    x: {
      type: "time",
      suggestedMin: new Date("2020/1/1").getTime(),
    },
  },
};

const labels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
  (x) => x * 2 + (Math.random() - 0.5)
);

type GHRepo = `${string}/${string}`;

async function getAllOrgData(org: string) {
  const repos = await getAllRepos(org);
  const results = await Promise.all(
    repos.map(async (repo) => {
      if (repo.stargazers_count === 0) {
        return { repo: repo.name, starHistory: [] };
      } else {
        return {
          repo: repo.name,
          starHistory: await api
            .getRepoStarRecords(repo.name, TOKEN, 10)
            .catch(() => {
              console.log(`error: getting data for ${repo.name}`);
              return [] as StarEntry[];
            }),
        };
      }
    })
  );

  // console.log(org, results.slice(0, 2));
  return results;
}

function extrapolateCounts(a: StarEntry, b: StarEntry, t: number) {
  if (t < a.date || t > b.date) {
    console.error(`t ${t} out of range (${a.date}, ${b.date})`);
  }

  const deltaX = b.date - a.date;
  const deltaY = b.count - a.count;
  const m = deltaY / deltaX;
  const y = (t - a.date) * m + a.count;
  return y;
}

type StarLinkedEntry = {
  date: number;
  count: number;
  next: StarLinkedEntry | null;
};

function asLinkedList(entires: StarEntry[]): StarLinkedEntry | null {
  if (entires.length < 1) {
    return null;
  }

  const first: StarLinkedEntry = {
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

async function getAggregatedOrgStarCounts(org: string) {
  const orgData = await getAllOrgData(org);
  const allData = orgData.map(({ repo, starHistory }) => ({
    repo,
    // TODO: ensure at least 2?
    starHistory: asLinkedList(starHistory),
  }));

  // bucketize by date
  // date -> entry[]
  // const aggregated = new Map<number, { repo: string; count: number }[]>();
  // for (const repo of allData) {
  //   for (const entry of repo.starHistory) {
  //     let bucket = aggregated.get(entry.date);
  //     if (bucket == null) {
  //       bucket = [];
  //       aggregated.set(entry.date, bucket);
  //     }
  //     bucket.push({
  //       repo: repo.repo,
  //       count: entry.count,
  //     });
  //   }
  // }

  // const dates = [...aggregated.entries()].sort(function ([adate], [bdate]) {
  //   return adate - bdate;
  // });

  // // repo => count
  // const repoState = new Map<string, number>();
  // // date => count
  // const timeline = Array<{ date: number; count: number }>();
  // for (const [date, entries] of dates) {
  //   // update state
  //   for (const entry of entries) {
  //     repoState.set(entry.repo, entry.count);
  //   }

  //   let total = 0;
  //   for (const [repo, count] of repoState.entries()) {
  //     console.log("at", date, "adding", count, "from", repo);
  //     total += count;
  //   }
  //   console.log("at", date, "total was", total);
  //   timeline.push({ date, count: total });
  // }

  const datesSet = new Set<number>();
  for (const repo of orgData) {
    for (const entry of repo.starHistory) {
      datesSet.add(entry.date);
    }
  }

  // sort ascending
  const allDates = [...datesSet].sort((a, b) => a - b);

  const repoState = new Map<string, StarLinkedEntry>();
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
    // console.log("at", date, "total was", total);
    timeline.push({ date, count: total });
  }

  return timeline;
}

type RepoDataset = ChartDataset<"line", { x: number; y: number }[]>;

async function repoDatasetReal(repo: GHRepo): Promise<RepoDataset> {
  // this is sorted
  const repoData = await api.getRepoStarRecords(repo, TOKEN, 10);

  return {
    label: repo,
    data: repoData.map((datum) => ({
      x: datum.date,
      y: datum.count,
    })),
    borderColor: randomcolor({ seed: repo }),
    backgroundColor: randomcolor({ seed: repo }),
  };
}

async function orgDataSetReal(org: string): Promise<RepoDataset> {
  // this is sorted
  const orgData = await getAggregatedOrgStarCounts(org);

  return {
    label: org,
    data: orgData.map((datum) => ({
      x: datum.date,
      y: datum.count,
    })),
    borderColor: randomcolor({ seed: org }),
    backgroundColor: randomcolor({ seed: org }),
  };
}

const REPO_REGEX = new RegExp("^([^/]+)(/[^/]+)?$", "i");

export default function App() {
  const [datasets, setDatasets] = useState<Record<string, RepoDataset>>({});
  const [repoInput, setRepoInput] = useState("sveltejs/svelte");

  async function loadRepo(repo: GHRepo) {
    const dataset = await repoDatasetReal(repo);
    setDatasets((prev) => ({ ...prev, [repo]: dataset }));
  }

  async function loadOrg(repo: string) {
    const dataset = await orgDataSetReal(repo);
    setDatasets((prev) => ({ ...prev, [repo]: dataset }));
  }

  useEffect(function loadDefaultRepos() {
    void (async function main() {
      void loadRepo("vuejs/vue");
      void loadRepo("vuejs/vue-router");
      void loadOrg("vuejs");
    })();
  }, []);

  const data: ChartData<"line", { x: number; y: number }[], number> = {
    datasets: Object.values(datasets),
  };

  const submit = async () => {
    const parsed = REPO_REGEX.exec(repoInput);
    console.log(parsed);
    if (parsed == null || parsed[1] == null) {
      console.error("invalid");
      return;
    }

    const org = parsed[1];
    const repo: string | null = parsed[2]?.substring(1) ?? null;
    console.log(org, repo);

    if (repo == null) {
      await loadOrg(org);
    } else {
      await loadRepo(`${org}/${repo}`);
    }

    setRepoInput("");
  };

  return (
    <>
      <div className="card">
        enter repo (ie, facebook/react) or enter org (ie, facebook)
        <br />
        <input
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          type="text"
          placeholder="enter repo (ie, facebook/react)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
          }}
        />
        <button onClick={submit}>🔎</button>
        <button onClick={() => setDatasets({})}>❌</button>
        <Line options={options} data={data} width={"500px"} height={400} />
      </div>
    </>
  );
}

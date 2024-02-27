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
import api from "./common/api";
import { DateEntry } from "./data/DateEntry";
import { GHRepo, GH_TOKEN, getAggregatedOrgStarCounts } from "./data/github";

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

const REPO_REGEX = new RegExp("^([^/]+)(/[^/]+)?$", "i");

export type LineDataset = ChartDataset<"line", { x: number; y: number }[]>;

async function datasetOfEntries(
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

export default function App() {
  const [datasets, setDatasets] = useState<Record<string, LineDataset>>({});
  const [repoInput, setRepoInput] = useState("sveltejs/svelte");

  async function loadRepo(repo: GHRepo) {
    const repoData = await api.getRepoStarRecords(repo, GH_TOKEN, 10);
    const dataset = await datasetOfEntries(repo, repoData);
    setDatasets((prev) => ({ ...prev, [repo]: dataset }));
  }

  async function loadOrg(org: string) {
    const orgData = await getAggregatedOrgStarCounts(org);
    const dataset = await datasetOfEntries(org, orgData);
    setDatasets((prev) => ({ ...prev, [org]: dataset }));
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

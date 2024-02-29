import {
  CategoryScale,
  ChartData,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import "./App.css";
import api from "./common/api";
import { GHRepo, GH_TOKEN, getAggregatedOrgStarCounts } from "./data/github";
import { fetchPepyDownloadData } from "./data/pepy";
import { Subject } from "./state/subject";
import { REPO_REGEX, arrayRemove } from "./utils";
import { chartDisplayOptions } from "./chart";
import { LineDataset } from "./chart";
import { datasetOfEntries } from "./chart";
import { datasetId } from "./chart";

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

export default function App() {
  const [subjects, setSubjects] = useState(() => [
    new Subject("facebook/react", "repo"),
  ]);
  const [repoInput, setRepoInput] = useState("sveltejs/svelte");

  async function loadRepo(repo: GHRepo) {
    const repoData = await api.getRepoStarRecords(repo, GH_TOKEN, 10);
    const dataset = await datasetOfEntries(repo, repoData);
    // setDatasets((prev) => ({ ...prev, [repo]: dataset }));
  }

  async function loadOrg(org: string) {
    const orgData = await getAggregatedOrgStarCounts(org);
    const dataset = await datasetOfEntries(org, orgData);
    // setDatasets((prev) => ({ ...prev, [org]: dataset }));
  }

  // useEffect(function loadDefaultRepos() {
  //   void (async function main() {
  //     void loadRepo("vuejs/vue");
  //     void loadRepo("vuejs/vue-router");
  //     void loadOrg("vuejs");
  //   })();
  // }, []);
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
      <ul>
        {subjects.map((subject) => {
          return (
            <li>
              {subject.id} ({subject.kind}){" "}
              <button
                onClick={() => {
                  console.log("WILL REM");
                  const newarr = arrayRemove(subject, subjects);
                  console.log("newarr", newarr);
                  setSubjects(newarr);
                }}
              >
                x
              </button>
            </li>
          );
        })}
      </ul>
      <GithubStarsChart subjects={subjects} />
      {/* <PepyDownloadsChart /> */}
    </div>
  );
}

function GithubStarsChart({ subjects }: { subjects: Subject[] }) {
  const chartOpts = useMemo(() => chartDisplayOptions("Github Stars"), []);

  const [promises] = useState(new Map<string, Promise<void>>());
  const [datasets, setDatasets] = useState<Record<string, LineDataset>>({});

  for (const subject of subjects) {
    // Add stars dataset
    const current = datasetId(subject, "stars");
    if (!promises.has(current)) {
      promises.set(
        current,
        subject.stars
          .then((stars) => datasetOfEntries(subject.id, stars))
          .then((dataset) =>
            setDatasets((prev) => ({ ...prev, [current]: dataset }))
          )
          .catch(console.error)
      );
    }

    // Add future stars dataset
    const future = datasetId(subject, "futureStars");
    if (!promises.has(future)) {
      promises.set(
        future,
        subject.futureStars
          .then((stars) => datasetOfEntries(`${subject.id} predictions`, stars))
          .then((dataset) =>
            setDatasets((prev) => ({ ...prev, [future]: dataset }))
          )
          .then(() => {
            console.log("future done");
          })
          .catch(console.error)
      );
    }
  }

  console.log("HERE", promises);

  const data = useMemo(() => {
    const data: ChartData<"line", { x: number; y: number }[], number> = {
      datasets: Object.values(datasets),
    };
    return data;
  }, [datasets]);

  return (
    <>
      <div className="card">
        <button onClick={() => setDatasets({})}>❌</button>
        <Line options={chartOpts} data={data} width={"500px"} height={400} />
      </div>
    </>
  );
}

function PepyDownloadsChart() {
  const [datasets, setDatasets] = useState<Record<string, LineDataset>>({});
  const [repoInput, setRepoInput] = useState("sveltejs/svelte");

  const pepyOptions = useMemo(() => chartDisplayOptions("Github Stars"), []);

  async function loadPackage(pkg: string) {
    const repoData = await fetchPepyDownloadData(pkg);
    const dataset = await datasetOfEntries(pkg, repoData);
    setDatasets((prev) => ({ ...prev, [pkg]: dataset }));
  }

  const data: ChartData<"line", { x: number; y: number }[], number> = useMemo(
    () => ({
      datasets: Object.values(datasets),
    }),
    [datasets]
  );

  return (
    <>
      <button
        onClick={async () => {
          const subject = new Subject("facebook/react", "repo");
          console.log(subject);
          (window as any).subject = subject;
        }}
      >
        test
      </button>
      <Line options={pepyOptions} data={data} width={"500px"} height={400} />
    </>
  );
}

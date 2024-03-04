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
import { PyPackageCard } from "./PyPackageCard";
import { LineDataset, chartDisplayOptions, datasetOfEntries } from "./chart";
import { predictDays } from "./data/nixtla";
import { GhOrg } from "./state/GhOrg";
import { PyPackage } from "./state/PyPackage";
import { arrayRemove, errMsg } from "./utils";

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

const chartId = (subject: PyPackage | GhOrg, chart: "current" | "future") =>
  `${subject.id}.${chart}`;

type ChartMap = Record<string, LineDataset>;

export default function App() {
  const [loadStatus, setLoadStatus] = useState<"loading" | "idle">();
  const [errorMsg, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<PyPackage[]>([]);
  const [orgs, setOrgs] = useState<GhOrg[]>([]);

  const [repoInput, setRepoInput] = useState("numpy");

  const [orgStarCharts, setOrgStarCharts] = useState<ChartMap>({});
  const [starCharts, setStarCharts] = useState<ChartMap>({});
  const [downloadCharts, setDownloadCharts] = useState<ChartMap>({});

  async function loadStars(pkg: PyPackage) {
    // Chart the current stars
    const stars = await pkg.loadStars();
    if (stars instanceof Error) {
      console.error("error", stars);
      setError(`Could not fetch github stars! Error: ${errMsg(stars)}`);
      return;
    }

    const starsDataset = datasetOfEntries(`${pkg.id} stars`, stars);
    setStarCharts((prev) => ({
      ...prev,
      [chartId(pkg, "current")]: starsDataset,
    }));

    if (stars[stars.length - 1].count > 40_000) {
      // TODO: max width
      setError(
        `Repos >40,000 stars don't load predictions. Only the first 40k stars events can be accessed. Without recent data, it's impossible to create an accurate prediction.`
      );
      return;
    }
    // Chart future stars
    const future = await predictDays(90, stars);
    if (future instanceof Error) {
      console.error(future);
      setError(
        `Could not predict future github stars! Error: ${errMsg(future)}`
      );
      return;
    }

    const chartDataset = datasetOfEntries(`${pkg.id} stars prediction`, future);
    setStarCharts((prev) => ({
      ...prev,
      [chartId(pkg, "future")]: chartDataset,
    }));
  }

  async function loadDownloads(pkg: PyPackage) {
    // Chart the current stars
    const downloads = await pkg.loadDownloads();
    if (downloads instanceof Error) {
      console.error(downloads);
      setError(`Could not fetch downloads! Error: ${errMsg(downloads)}`);
      return;
    }

    const dlsDataset = datasetOfEntries(`${pkg.id} downloads`, downloads);
    setDownloadCharts((prev) => ({
      ...prev,
      [chartId(pkg, "current")]: dlsDataset,
    }));

    // Chart future stars
    const future = await predictDays(90, downloads);
    if (future instanceof Error) {
      console.error(future);
      setError(`Could not predict future downloads! Error: ${errMsg(future)}`);
      return;
    }

    const chartDataset = datasetOfEntries(
      `${pkg.id} downloads prediction`,
      future
    );
    setDownloadCharts((prev) => ({
      ...prev,
      [chartId(pkg, "future")]: chartDataset,
    }));
  }

  async function loadPackage() {
    setLoadStatus("loading");
    setError(null);
    try {
      const pkg = repoInput;
      setRepoInput("");
      const subject = await PyPackage.fetch(pkg);
      setSubjects((prev) => [...prev, subject]);
      setLoadStatus("idle");

      void loadStars(subject);
      void loadDownloads(subject);
      if (subject.org != null) {
        void loadOrg(subject.org);
      }
    } catch (e) {
      setError(errMsg(e));
      setLoadStatus("idle");
    }
  }

  async function loadOrg(id: string) {
    for (const existing of orgs) {
      if (id === existing.id) {
        return;
      }
    }

    const org = await GhOrg.fetch(id);
    if (org instanceof Error) {
      console.error(org);
      setError(`Error loading org ${id}: ${errMsg(org)}`);
      return;
    }

    setOrgs((prev) => [...prev, org]);

    // Chart the current stars
    const stars = await org.loadStars();
    if (stars instanceof Error) {
      console.error("error", stars);
      setError(`Could not fetch github org stars! Error: ${errMsg(stars)}`);
      return;
    }

    const starsDataset = datasetOfEntries(`${org.id} total stars`, stars);
    setOrgStarCharts((prev) => ({
      ...prev,
      [chartId(org, "current")]: starsDataset,
    }));

    // Chart future stars
    console.log("fetching future");
    const future = await predictDays(90, stars);
    if (future instanceof Error) {
      console.error(future);
      setError(
        `Could not predict future github org stars! Error: ${errMsg(future)}`
      );
      return;
    }

    const chartDataset = datasetOfEntries(`${org.id} stars prediction`, future);
    setOrgStarCharts((prev) => ({
      ...prev,
      [chartId(org, "future")]: chartDataset,
    }));
  }

  function removePackage(subject: PyPackage) {
    const newarr = arrayRemove(subject, subjects);
    delete starCharts[chartId(subject, "current")];
    delete starCharts[chartId(subject, "future")];
    delete downloadCharts[chartId(subject, "current")];
    delete downloadCharts[chartId(subject, "future")];

    const wantOrgs = new Set(newarr.map((s) => s.org));
    for (const org of orgs) {
      if (!wantOrgs.has(org.id)) {
        delete orgStarCharts[chartId(org, "current")];
        delete orgStarCharts[chartId(org, "future")];
        const neworgs = arrayRemove(org, orgs);
        setOrgs(neworgs);
        break;
      }
    }

    setSubjects(newarr);
  }

  const starChartsArr = Object.values(starCharts);
  const downloadChartsArr = Object.values(downloadCharts);
  const orgStarChartsArr = Object.values(orgStarCharts);

  return (
    <>
      <h1>enter a python package</h1>
      <div style={{ display: "flex", flexDirection: "row", gap: 3 }}>
        <input
          style={{ flexGrow: 1, fontSize: "1.3em" }}
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          type="text"
          placeholder="enter package (ie, numpy, keras)"
          onKeyDown={(e) => {
            if (loadStatus === "loading") {
              return;
            }
            if (e.key === "Enter") {
              void loadPackage();
            }
          }}
        />
        <button
          disabled={loadStatus === "loading"}
          onClick={() => {
            void loadPackage();
          }}
        >
          🔎
        </button>
      </div>
      {errorMsg && (
        <div className="error">
          {errorMsg}
          <button onClick={() => setError(null)}>x</button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        {subjects.map((subject) => {
          return (
            <PyPackageCard
              key={subject.id}
              subject={subject}
              onRemove={removePackage}
            />
          );
        })}
      </div>
      {orgStarChartsArr.length > 0 && (
        <OrgStarsChart datasets={orgStarChartsArr} />
      )}
      {starChartsArr.length > 0 && (
        <GithubStarsChart datasets={starChartsArr} />
      )}

      {downloadChartsArr.length > 0 && (
        <PepyDownloadsChart datasets={downloadChartsArr} />
      )}
    </>
  );
}

function GithubStarsChart({ datasets }: { datasets: LineDataset[] }) {
  const chartOpts = useMemo(() => chartDisplayOptions("Github Stars"), []);

  const data = useMemo(() => {
    const data: ChartData<"line", { x: number; y: number }[], number> = {
      datasets,
    };
    return data;
  }, [datasets]);

  return (
    <div className="card">
      <Line options={chartOpts} data={data} width={"500px"} height={400} />
    </div>
  );
}

function PepyDownloadsChart({ datasets }: { datasets: LineDataset[] }) {
  const chartOptions = useMemo(() => chartDisplayOptions("Pepy Downloads"), []);

  const data: ChartData<"line", { x: number; y: number }[], number> = useMemo(
    () => ({
      datasets: datasets,
    }),
    [datasets]
  );

  return (
    <div className="card">
      <Line options={chartOptions} data={data} width={"500px"} height={400} />
    </div>
  );
}

function OrgStarsChart({ datasets }: { datasets: LineDataset[] }) {
  const chartOptions = useMemo(() => chartDisplayOptions("Org Stars"), []);

  const data: ChartData<"line", { x: number; y: number }[], number> = useMemo(
    () => ({
      datasets: datasets,
    }),
    [datasets]
  );

  return (
    <div className="card">
      <Line options={chartOptions} data={data} width={"500px"} height={400} />
    </div>
  );
}

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
import { LineDataset, chartDisplayOptions, datasetOfEntries } from "./chart";
import { predictDays } from "./data/nixtla";
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

const chartId = (
  subject: PyPackage,
  chart: "stars" | "stars.future" | "downloads" | "downloads.future"
) => `${subject.id}.${chart}`;

export default function App() {
  const [loadStatus, setLoadStatus] = useState<"loading" | "idle">();
  const [errorMsg, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<PyPackage[]>([]);
  const [repoInput, setRepoInput] = useState("numpy");
  const [starCharts, setStarCharts] = useState<Record<string, LineDataset>>({});
  const [downloadCharts, setDownloadCharts] = useState<
    Record<string, LineDataset>
  >({});

  async function loadStars(subject: PyPackage) {
    // Chart the current stars
    const stars = await subject.loadStars();
    if (stars instanceof Error) {
      console.error("error", stars);
      setError(`Could not fetch github stars! Error: ${errMsg(stars)}`);
      return;
    }

    const starsDataset = datasetOfEntries(`${subject.id} stars`, stars);
    setStarCharts((prev) => ({
      ...prev,
      [chartId(subject, "stars")]: starsDataset,
    }));

    // Chart future stars
    const future = await predictDays(90, stars);
    if (future instanceof Error) {
      console.error(future);
      setError(
        `Could not predict future github stars! Error: ${errMsg(future)}`
      );
      return;
    }

    const chartDataset = datasetOfEntries(
      `${subject.id} stars prediction`,
      future
    );
    setStarCharts((prev) => ({
      ...prev,
      [chartId(subject, "stars.future")]: chartDataset,
    }));
  }

  async function loadDownloads(subject: PyPackage) {
    // Chart the current stars
    const downloads = await subject.loadDownloads();
    if (downloads instanceof Error) {
      console.error(downloads);
      setError(`Could not fetch downloads! Error: ${errMsg(downloads)}`);
      return;
    }

    const dlsDataset = datasetOfEntries(`${subject.id} downloads`, downloads);
    setDownloadCharts((prev) => ({
      ...prev,
      [chartId(subject, "downloads")]: dlsDataset,
    }));

    // Chart future stars
    const future = await predictDays(90, downloads);
    if (future instanceof Error) {
      console.error(future);
      setError(`Could not predict future downloads! Error: ${errMsg(future)}`);
      return;
    }

    const chartDataset = datasetOfEntries(
      `${subject.id} downloads prediction`,
      future
    );
    setDownloadCharts((prev) => ({
      ...prev,
      [chartId(subject, "downloads.future")]: chartDataset,
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
    } catch (e) {
      setError(errMsg(e));
      setLoadStatus("idle");
    }
  }

  function removePackage(subject: PyPackage) {
    const newarr = arrayRemove(subject, subjects);
    delete starCharts[chartId(subject, "stars")];
    delete starCharts[chartId(subject, "stars.future")];
    delete downloadCharts[chartId(subject, "downloads")];
    delete downloadCharts[chartId(subject, "downloads.future")];

    setSubjects(newarr);
  }

  const starChartsArr = Object.values(starCharts);
  const downloadChartsArr = Object.values(downloadCharts);

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
      {errorMsg && <div className="error">{errorMsg}</div>}
      <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
        {subjects.map((subject) => {
          return (
            <div
              key={subject.id}
              style={{ display: "flex", flexDirection: "row", gap: 4 }}
            >
              {subject.id}
              <button onClick={() => removePackage(subject)}>x</button>
            </div>
          );
        })}
      </div>
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

import type { ChartData } from "chart.js";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import "./App.css";
import { PyPackageCard } from "./PyPackageCard";
import {
  ChartMap,
  LineDataset,
  chartDisplayOptions,
  chartId,
  datasetOfEntries,
} from "./chart";
import { predictDays } from "./data/nixtla";
import { GhOrg } from "./state/GhOrg";
import { PyPackage } from "./state/PyPackage";
import { ReactiveValue, useReactive } from "./state/ReactiveValue";
import { arrayRemove, errMsg } from "./utils";

const pkgState = ReactiveValue.of<PyPackage[]>([]);
const orgsState = ReactiveValue.of<GhOrg[]>([]);

export default function App() {
  const [loadStatus, setLoadStatus] = useState<"loading" | "idle">();
  const [errorMsg, setError] = useState<string | null>(null);
  const [pkgs, setPkgs] = useReactive<PyPackage[]>(pkgState);
  const [orgs, setOrgs] = useReactive<GhOrg[]>(orgsState);
  const [repoInput, setRepoInput] = useState("");
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
    } else if (pkgState.get().indexOf(pkg) < 0) {
      // we no longer want to show this
      return;
    }

    const starsDataset = datasetOfEntries(`${pkg.id} stars`, stars);

    setStarCharts((prev) => ({
      ...prev,
      [chartId(pkg, "current")]: starsDataset,
    }));

    if (stars[stars.length - 1].count > 40_000) {
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
    } else if (pkgState.get().indexOf(pkg) < 0) {
      // we no longer want to show this
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
    } else if (pkgState.get().indexOf(pkg) < 0) {
      // we no longer want to show this
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
    } else if (pkgState.get().indexOf(pkg) < 0) {
      // we no longer want to show this
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
      const pkg = repoInput.toLowerCase();
      setRepoInput("");
      const subject = await PyPackage.fetch(pkg);
      setPkgs((prev) => [...prev, subject]);
      setLoadStatus("idle");

      setTimeout(() => {
        void loadStars(subject);
        void loadDownloads(subject);
        if (subject.org != null) {
          void loadOrg(subject.org);
        }
      }, 0);
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

    // Before we add the org, confirm we still want to show it
    const wantOrgs = new Set(pkgState.get().map((s) => s.org));
    if (!wantOrgs.has(org.id)) {
      // we no longer want to show this org
      return;
    }

    setOrgs((prev) => [...prev, org]);

    // Chart the current stars
    const stars = await org.loadStars();
    if (stars instanceof Error) {
      console.error("error", stars);
      setError(`Could not fetch github org stars! Error: ${errMsg(stars)}`);
      return;
    } else if (orgsState.get().indexOf(org) < 0) {
      // we no longer want to show this org
      return;
    }

    const starsDataset = datasetOfEntries(`${org.id} total stars`, stars);
    setOrgStarCharts((prev) => ({
      ...prev,
      [chartId(org, "current")]: starsDataset,
    }));

    // Chart future stars
    const future = await predictDays(90, stars);
    if (future instanceof Error) {
      console.error(future);
      setError(
        `Could not predict future github org stars! Error: ${errMsg(future)}`
      );
      return;
    } else if (orgsState.get().indexOf(org) < 0) {
      // we no longer want to show this org
      return;
    }

    const chartDataset = datasetOfEntries(`${org.id} stars prediction`, future);
    setOrgStarCharts((prev) => ({
      ...prev,
      [chartId(org, "future")]: chartDataset,
    }));
  }

  function removePackage(subject: PyPackage) {
    const newarr = arrayRemove(subject, pkgs);
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

    setPkgs(newarr);
  }

  const starChartsArr = Object.values(starCharts);
  const downloadChartsArr = Object.values(downloadCharts);
  const orgStarChartsArr = Object.values(orgStarCharts);

  return (
    <>
      <header>
        <h1
          style={{
            display: "inline-flex",
            gap: 8,
            position: "relative",
            top: "-1px",
          }}
        >
          <img src="/python.svg" width={16}></img>{" "}
          <span className="onWide">
            Python Package Stats <small style={{ color: "gray" }}>v0.1.0</small>
          </span>
        </h1>
        <div className="spacer"></div>
        <a href="http://aykev.dev/" target="_blank">
          author
        </a>
        {"·"}
        <a href="https://twitter.com/aykev" target="_blank">
          <i className="ri-twitter-line"></i>
        </a>
      </header>

      <details
        style={{
          textAlign: "left",
          margin: "-10px 0px 80px 22px",
          fontSize: "0.825em",
        }}
      >
        <summary style={{ color: "gray", cursor: "pointer" }}>
          How to use this site?
        </summary>
        <p>
          This site is an alternative to{" "}
          <a href="https://star-history.com/blog/how-to-use-github-star-history">
            Star History
          </a>
          , with some extra goodies. It shows you 3 key pieces of historical
          data about open source python packages:
        </p>
        <ul>
          <li>Github star history</li>
          <li>Github org aggreate star history</li>
          <li>
            Downloads on <a href="https://www.pepy.tech/">Pepy</a>
          </li>
        </ul>
        <p>
          For each of these, you can see historical trends. Moreover, it uses{" "}
          <a href="https://docs.nixtla.io/">TimeGPT</a> to show the predicted
          trend into the future.
        </p>
        <p>
          This information can be useful when deciding to use a package in your
          project, or drop it in favour of something else. Load multiple
          packages at a time and see how they compare!
        </p>
      </details>
      <b>enter a python package</b>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 3,
        }}
      >
        <input
          style={{ flexGrow: 1, fontSize: "1.3em", padding: "12px 8px" }}
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          type="text"
          placeholder="enter package (ie, nixtla, numpy, keras...)"
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
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {pkgs.map((subject) => {
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
      <div className="spacer"></div>
      <footer>
        2024
        {"·"}
        <a href="http://aykev.dev/" target="_blank">
          Kevin Chavez
        </a>
        {"·"}
        <a href="https://twitter.com/aykev" target="_blank">
          <i className="ri-twitter-line"></i>
        </a>
      </footer>
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

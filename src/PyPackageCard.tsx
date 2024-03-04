import { PyPackage } from "./state/PyPackage";
import { useReactive } from "./state/ReactiveValue";

export function PyPackageCard({
  subject,
  onRemove,
}: {
  subject: PyPackage;
  onRemove: (subject: PyPackage) => void;
}) {
  const [totalStars] = useReactive(subject.currentStars);

  const warnStars = totalStars != null && totalStars > 40_000;

  return (
    <div key={subject.id} className="subjectCard">
      <b>{subject.id}</b>
      <div>
        <span className="subtle">
          <i
            className="ri-star-fill"
            style={{ margin: "0px 2px 0px 0px", position: "relative", top: -1 }}
          ></i>
          {totalStars != null ? totalStars.toLocaleString() : "--"}
        </span>
        {warnStars && (
          <i
            title="Over 40k stars. Star predictions not loaded."
            className="ri-error-warning-fill"
            style={{ margin: "0px 2px", color: "#E9C3D6" }}
          ></i>
        )}
      </div>

      <div className="subtle">
        <i className="ri-github-fill" style={{ marginRight: "2px" }}></i>
        {subject.repo ? (
          <a
            target="_blank"
            href={`https://github.com/${subject.repo[0]}/${subject.repo[1]}`}
          >
            {subject.repo[0]}/{subject.repo[1]}
          </a>
        ) : (
          <i>unknown</i>
        )}
      </div>
      {/* {subject.repo ? (
        <button className="subtle" onClick={() => {}}>
          org stars: {subject.repo[0]}
        </button>
      ) : (
        <br />
      )} */}
      <button
        style={{
          position: "absolute",
          right: 4,
          top: 4,
          boxSizing: "border-box",
        }}
        onClick={() => onRemove(subject)}
      >
        x
      </button>
    </div>
  );
}

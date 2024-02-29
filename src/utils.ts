import { useEffect, useState } from "react";

export function exhaustive(x: never): never {
  throw new Error(`Exhaustive violation, unexpected value ${x}`);
}

export type PromiseStatus<T> =
  | { status: "waiting" }
  | { status: "resolved"; value: T }
  | { status: "rejected"; message: string };
export function usePromise<T>(promise: Promise<T>): PromiseStatus<T> {
  const [state, setState] = useState<PromiseStatus<T>>({ status: "waiting" });
  useEffect(() => {
    promise
      .then((value) => setState({ status: "resolved", value }))
      .catch((error) =>
        setState({
          status: "rejected",
          message:
            error instanceof Error
              ? error.message
              : typeof error === "string"
              ? error
              : "Unparsable error",
        })
      );
  });
  return state;
}

export function arrayRemove<T>(remove: T, arr: T[]): T[] {
  const res: T[] = [];
  for (const elem of arr) {
    if (elem === remove) {
      continue;
    }
    console.log("HOO");
    res.push(elem);
  }
  return res.length === arr.length ? arr : res;
}

export const REPO_REGEX = new RegExp("^([^/]+)(/[^/]+)?$", "i");

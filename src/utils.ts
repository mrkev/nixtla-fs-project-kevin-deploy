export const REPO_REGEX = new RegExp("^([^/]+)(/[^/]+)?$", "i");

export function exhaustive(x: never): never {
  throw new Error(`Exhaustive violation, unexpected value ${x}`);
}

export function arrayRemove<T>(remove: T, arr: T[]): T[] {
  const res: T[] = [];
  for (const elem of arr) {
    if (elem === remove) {
      continue;
    }

    res.push(elem);
  }
  return res.length === arr.length ? arr : res;
}

export function errMsg(e: unknown) {
  return e instanceof Error
    ? e.message
    : typeof e === "string"
    ? e
    : `Unknown Error`;
}

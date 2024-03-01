import { DateEntry, ascendingEntrySort } from "./DateEntry";
import z from "zod";

// const PEPY_BASE_URL = "https://api.pepy.tech";
const PEPY_BASE_URL = "https://api.pepy.tech";
const PEPY_KEY = import.meta.env.VITE_PEPY_KEY;

const PepyResponse = z.union([
  z.object({ message: z.string() }),
  z.object({
    id: z.string(),
    downloads: z.record(/* date */ z.record(/* version */ z.number())),
    // ... others
  }),
]);
export type PepyResponse = z.infer<typeof PepyResponse>;

// `https://api.github.com/repos/facebook/react/stargazers?per_page=30`,

export async function fetchPepyDownloadData(pkg: string): Promise<DateEntry[]> {
  const response = await fetch(`/pepy/v2/projects/${pkg}`, {
    headers: {
      "X-Api-Key": PEPY_KEY,
    },
  });

  const json = await response.json();

  const result = PepyResponse.parse(json);
  if ("message" in result) {
    throw new Error(result.message);
  }

  const dateEntries: DateEntry[] = [];
  for (const [date, versions] of Object.entries(result.downloads)) {
    let total = 0;

    for (const [_version, num] of Object.entries(versions)) {
      total += num;
    }

    dateEntries.push({ date: new Date(date).getTime(), count: total });
  }

  dateEntries.sort(ascendingEntrySort);
  return dateEntries;
}

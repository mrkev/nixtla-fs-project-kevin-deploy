import z from "zod";
import { DateEntry, ascendingEntrySort } from "./DateEntry";
import { errMsg } from "../utils";

type SeriesRequest = {
  model?: "timegpt-1" | "timegpt-1-long-horizon";
  freq: string;
  fh: number;
  clean_ex_first?: boolean;
  finetune_steps?: number;
  finetune_loss?: string;
};
// NOTE: incomplete type
const SeriesResponseSuccess = z.object({
  data: z.object({
    timestamp: z.array(z.string()),
    value: z.array(z.number()),
    input_tokens: z.number(),
    output_tokens: z.number(),
    finetune_tokens: z.number(),
  }),
  message: z.literal("success"),
});

// NOTE: incomplete type
const SeriesResponseFailure = z.object({
  data: z.null(),
  message: z.string(),
});

const SeriesResponse = z.union([SeriesResponseSuccess, SeriesResponseFailure]);
export type SeriesResponse = z.infer<typeof SeriesResponse>;

export async function predictSeries(
  {
    model = "timegpt-1",
    freq,
    fh,
    clean_ex_first = true,
    finetune_steps = 0,
    finetune_loss = "default",
  }: SeriesRequest,
  data: DateEntry[]
) {
  const dataRecord = {} as Record<string, number>;
  for (const datum of data) {
    const dayStr = new Date(datum.date).toISOString().split("T")[0];
    if (dayStr in dataRecord) {
      console.warn("repeat days");
    }
    dataRecord[dayStr] = datum.count;
  }

  const body = JSON.stringify({
    model,
    freq,
    fh,
    y: dataRecord,
    clean_ex_first,
    finetune_steps,
    finetune_loss,
  });

  const response = await fetch("https://dashboard.nixtla.io/api/timegpt", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization:
        "Bearer zaeqhO8zBQh18QKUVAIoTOkWuwKONyHOG4C9MGBezvonPYJXzLlZSWTqMPtttYLQNuZpmLJvWmGSBpd7TeUMTnYWg6TNGzAny3w3tQb3TQj1MegQoip3v2b3rXqktBLUfTzZ3j0qFYV5xgE093mXQPdBcnDtn9wp3YTwD6xmH79EatbG1bwcUnCyqxkmHVxeSRBFNTlz5kcQjA8S6Mx7zTgQdRZ1cm7sgIHwjRjowrlMZkn0yj1YyJ5vsc1MdDVv",
      "Content-Type": "application/json",
    },
    body: body,
  });

  const json = await response.json();
  const result: SeriesResponse = SeriesResponse.parse(json);

  return result;
}

export async function predictDays(
  days: number,
  entries: DateEntry[]
): Promise<DateEntry[] | Error> {
  try {
    const result = await predictSeries({ freq: "D", fh: days }, entries);
    if (result.data == null) {
      return new Error(result.message);
    }

    const resEntries: DateEntry[] = [];
    for (let i = 0; i < result.data.timestamp.length; i++) {
      const timestamp = result.data.timestamp[i];
      const value = result.data.value[i];
      resEntries.push({
        date: new Date(timestamp).getTime(),
        count: value,
      });
    }
    resEntries.sort(ascendingEntrySort);
    return resEntries;
  } catch (e) {
    return new Error(errMsg(e));
  }
}

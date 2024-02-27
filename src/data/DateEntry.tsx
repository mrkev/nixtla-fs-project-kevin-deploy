export type DateEntry = {
  date: number; // unixtime
  count: number;
};

// As linked list
export type DateLinkedEntry = {
  date: number;
  count: number;
  next: DateLinkedEntry | null;
};

/**
 * @returns an aproximate value at a point date t
 * appropriately extrapolating lineraly between the values of a and b
 */
export function extrapolateCounts(a: DateEntry, b: DateEntry, t: number) {
  if (t < a.date || t > b.date) {
    throw new Error(`t ${t} out of range (${a.date}, ${b.date})`);
  }

  const deltaX = b.date - a.date;
  const deltaY = b.count - a.count;
  const m = deltaY / deltaX;
  const y = (t - a.date) * m + a.count;
  return y;
}

export function groupByDay(isoDates: string[], days = 14) {
  const counts = new Map<string, number>();
  for (const d of isoDates) {
    const key = d.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    buckets.push({ label: `${date.getDate()}/${date.getMonth() + 1}`, value: counts.get(key) ?? 0 });
  }
  return buckets;
}

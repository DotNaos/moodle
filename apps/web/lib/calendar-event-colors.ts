const EVENT_PALETTE = [
  { card: "bg-blue-600 hover:bg-blue-700", dot: "bg-blue-600", time: "text-blue-100" },
  { card: "bg-violet-600 hover:bg-violet-700", dot: "bg-violet-600", time: "text-violet-100" },
  { card: "bg-emerald-600 hover:bg-emerald-700", dot: "bg-emerald-600", time: "text-emerald-100" },
  { card: "bg-amber-600 hover:bg-amber-700", dot: "bg-amber-600", time: "text-amber-100" },
  { card: "bg-rose-600 hover:bg-rose-700", dot: "bg-rose-600", time: "text-rose-100" },
  { card: "bg-cyan-600 hover:bg-cyan-700", dot: "bg-cyan-600", time: "text-cyan-100" },
] as const;

export function eventColorClasses(seed: string): { card: string; dot: string; time: string } {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % EVENT_PALETTE.length;
  }
  return EVENT_PALETTE[hash] ?? EVENT_PALETTE[0];
}

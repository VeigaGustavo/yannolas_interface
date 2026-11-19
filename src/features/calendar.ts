import type { Session, Settings } from "../types/studio";
export const dateKey = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
export const parseDay = (s: string) => new Date(s + "T12:00:00");
export function addDays(day: Date, amount: number) {
  const next = new Date(day);
  next.setDate(day.getDate() + amount);
  return next;
}
export function calendarDays(day: Date, view: string) {
  if (view === "Dia") return [day];
  const first =
    view === "Mês" ? new Date(day.getFullYear(), day.getMonth(), 1, 12) : day;
  const start = addDays(first, -first.getDay());
  return Array.from({ length: view === "Mês" ? 42 : 7 }, (_, i) =>
    addDays(start, i),
  );
}
export const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function overlaps(
  a: Pick<Session, "date" | "time" | "duration">,
  b: Session,
) {
  return (
    b.status !== "Cancelado" &&
    a.date === b.date &&
    minutes(a.time) < minutes(b.time) + b.duration &&
    minutes(b.time) < minutes(a.time) + a.duration
  );
}
export function workingHours(settings: Settings) {
  return {
    opensAt: settings.opensAt || "10:00",
    closesAt: settings.closesAt || "19:00",
  };
}
export function availableTimes(
  date: string,
  sessions: Session[],
  settings: Settings,
) {
  const { opensAt, closesAt } = workingHours(settings);
  const start = minutes(opensAt);
  return Array.from(
    { length: Math.max(0, Math.floor((minutes(closesAt) - start) / 60)) },
    (_, i) => {
      const slot = start + i * 60;
      return (
        String(Math.floor(slot / 60)).padStart(2, "0") +
        ":" +
        String(slot % 60).padStart(2, "0")
      );
    },
  ).filter(
    (time) => !sessions.some((s) => overlaps({ date, time, duration: 60 }, s)),
  );
}

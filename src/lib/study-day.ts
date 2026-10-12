export const STUDY_TIME_ZONE = "America/Sao_Paulo";
export const MIN_SUMMARY_LENGTH = 30;
export function studyDay(value: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: STUDY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function shiftStudyDay(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function studyCalendarDate(value: Date = new Date()) { return new Date(`${studyDay(value)}T12:00:00`); }
export function minutesUntilStudyMidnight(value: Date) {
  const next = new Date(`${shiftStudyDay(studyDay(value), 1)}T00:00:00-03:00`);
  return Math.max(0, Math.ceil((next.getTime() - value.getTime()) / 60000));
}
export function reviewEligible(summary: string | null | undefined) { return (summary?.trim().length ?? 0) >= MIN_SUMMARY_LENGTH; }
export const reviewDraftKey = (userId: string, trackId: string, threadId: string) => `sapiens:review-draft:${userId}:${trackId}:${threadId}`;
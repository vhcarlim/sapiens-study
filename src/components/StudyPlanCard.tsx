import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, Circle } from "lucide-react";
import { useTrack } from "@/lib/tracks";
import { activitiesQuery, skillsQuery } from "@/lib/data";
import { masteryQuery } from "@/lib/reviews";
import { computeExamWeights, examBlocksQuery, skillRulesQuery } from "@/lib/exam-rules";
import { pastExamsQuery } from "@/lib/past-exams";
import { studyDay } from "@/lib/study-day";
import { buildWeek, DEFAULT_BLOCK, DEFAULT_WEEKLY, dueReviewsQuery, planOverridesQuery, planSettingsQuery, weekStartOf, type DayAdjust, type PlanActivity } from "@/lib/study-plan";
import { fmtMinutes } from "@/lib/data";
import { Button } from "@/components/ui/button";

/** Shared data + derived plan for the current track and a given week. */
export function useStudyPlan(weekStart: string) {
  const { trackId, track } = useTrack();
  const today = studyDay();
  const acts = useQuery(activitiesQuery("approved", trackId));
  const skills = useQuery(skillsQuery(trackId));
  const mastery = useQuery(masteryQuery(trackId));
  const blocks = useQuery(examBlocksQuery(trackId));
  const rules = useQuery(skillRulesQuery(trackId));
  const exams = useQuery(pastExamsQuery(trackId));
  const settings = useQuery(planSettingsQuery(trackId));
  const overrides = useQuery(planOverridesQuery(trackId, weekStart));
  const due = useQuery(dueReviewsQuery(trackId));
  const weekly = settings.data?.weekly_minutes ?? DEFAULT_WEEKLY;
  const blockMinutes = settings.data?.block_minutes ?? DEFAULT_BLOCK;
  const planActs: PlanActivity[] = useMemo(() => (acts.data ?? []).map((a) => ({ date: a.date, syllabus_topic: a.syllabus_topic, skill_ids: a.activity_skills?.map((x) => x.skill_id) ?? [], created_at: a.created_at, perception: a.perception, minutes: a.minutes })), [acts.data]);
  const weights = useMemo(() => computeExamWeights((skills.data ?? []).map((s) => s.id), blocks.data ?? [], rules.data ?? []), [skills.data, blocks.data, rules.data]);
  const points = useMemo(() => new Map(weights.map((w) => [w.skillId, w.points])), [weights]);
  const week = useMemo(() => buildWeek({
    weekStart, today, weekly, blockMinutes,
    skills: skills.data ?? [], activities: planActs,
    ctx: { points, difficulty: new Map(weights.map((w) => [w.skillId, w.difficulty])), mastery: new Map((mastery.data ?? []).map((m) => [m.skill_id, m.mastery])) },
    examDate: track?.exam_date ?? null,
    pinned: overrides.data?.pinned ?? [], skipped: overrides.data?.skipped ?? [], dayAdjust: (overrides.data?.day_adjust ?? {}) as DayAdjust,
    reviewDue: (due.data ?? []).map((d) => studyDay(d)),
    hasPastExams: (exams.data ?? []).length > 0,
  }), [weekStart, today, weekly, blockMinutes, skills.data, planActs, points, weights, mastery.data, track?.exam_date, overrides.data, due.data, exams.data]);
  return { trackId, track, today, week, weekly, blockMinutes, skills: skills.data ?? [], planActs, points, weights, overrides: overrides.data, settings: settings.data, exams: exams.data ?? [], loading: acts.isLoading || skills.isLoading || settings.isLoading };
}

export function TodayPlanCard() {
  const today = studyDay();
  const { week, loading } = useStudyPlan(weekStartOf(today));
  const day = week.find((d) => d.isToday);
  if (loading || !day) return null;
  const done = day.blocks.filter((b) => b.done).length;
  const next = day.blocks.find((b) => !b.done);
  return <section aria-label="Hoje no plano" className="flex flex-wrap items-center justify-between gap-4 border bg-card px-5 py-4">
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <CalendarCheck className="mt-1 size-6 shrink-0 text-track-accent" />
      <div className="min-w-0">
        <p className="font-mono text-xs text-track-accent">HOJE NO PLANO · {done}/{day.blocks.length} BLOCOS</p>
        {day.blocks.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Dia livre no seu plano. Descanso também faz parte da preparação.</p> : <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {day.blocks.map((b, i) => <li key={i} className="flex items-center gap-1.5">{b.done ? <CheckCircle2 className="size-4 text-track-accent" /> : <Circle className="size-4 text-muted-foreground" />}<span className={b.done ? "text-muted-foreground line-through" : ""}>{b.skillName}</span><span className="font-mono text-[0.6875rem] text-muted-foreground">{fmtMinutes(b.minutes)}</span></li>)}
        </ul>}
      </div>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" asChild><Link to="/plano">Ver plano</Link></Button>
      {next?.kind === "study" && next.skillId && next.topic && <Button asChild><Link to="/arena" search={{ skill: next.skillId, topic: next.topic }}>Próximo bloco</Link></Button>}
    </div>
  </section>;
}

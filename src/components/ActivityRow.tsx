import { Award, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Activity, type Skill, type Source, fmtMinutes, typeLabel } from "@/lib/data";
import { cn } from "@/lib/utils";
import { activityXp } from "@/lib/gamification";

export function ActivityRow({
  a,
  sources,
  skills,
  actions,
  showDate = true,
}: {
  a: Activity;
  sources: Source[];
  skills: Skill[];
  actions?: React.ReactNode;
  showDate?: boolean;
}) {
  const src = sources.find((s) => s.id === a.source_id);
  const milestone = a.type === "certificate" || a.type === "level";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-3",
        milestone && "border-warning/60",
      )}
    >
      <div className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: src?.color ?? "gray" }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {a.type === "certificate" && <Award className="size-4 text-warning" />}
          {a.type === "level" && <TrendingUp className="size-4 text-warning" />}
          <span className="font-medium">{a.title}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {showDate && <span className="font-mono">{format(parseISO(a.date), "dd MMM yyyy", { locale: ptBR })}</span>}
          <span>{src?.name ?? "Sem fonte"}</span>
          <span>{typeLabel(a.type)} ×{a.quantity}</span>
          <span className="font-mono">{fmtMinutes(a.minutes)}</span>
          {activityXp(a) > 0 && <span className="font-mono text-primary">{activityXp(a)} XP</span>}
          {a.activity_skills.map((as) => {
            const sk = skills.find((s) => s.id === as.skill_id);
            return sk ? (
              <span key={sk.id} className="rounded-full bg-secondary px-2 py-0.5 text-foreground">
                {sk.name}
              </span>
            ) : null;
          })}
        </div>
        {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
    </div>
  );
}

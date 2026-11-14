import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";

/** Thin brand-colored bar shown only when navigation takes longer than 150 ms. */
export function TopProgress() {
  const pending = useRouterState({ select: (s) => s.status === "pending" });
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!pending) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, [pending]);
  return show ? <div className="top-progress" role="progressbar" aria-label="Carregando página" /> : null;
}

/** Layout-shaped placeholder that keeps the page from jumping while data loads. */
export function PageSkeleton() {
  return <div className="space-y-6" aria-busy="true" aria-label="Carregando">
    <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-full max-w-xl" /></div>
    <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
    <Skeleton className="h-64" />
  </div>;
}

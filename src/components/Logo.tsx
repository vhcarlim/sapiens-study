export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 46V34a26 26 0 0 1 52 0v8" />
      <path d="M57 50c-2 10-7 19-14 26" />
      <path d="M13 54V34a19 19 0 0 1 38 0v10" />
      <path d="M50 52c-2 8-6 14-11 19" />
      <path d="M20 60V34a12 12 0 0 1 24 0v12c0 6-2 12-6 18" />
      <path d="M24 56c1 7 2 13 4 19" />
      <path d="M28 46v-3a8 8 0 1 1 8 0v3z" />
      <path d="M32 33v6" />
      <path d="M29 50h6M30 53.5h4" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-7 w-7 text-brand" />
      <span className="font-serif text-lg font-semibold tracking-tight text-foreground">Sapiens Study</span>
    </span>
  );
}

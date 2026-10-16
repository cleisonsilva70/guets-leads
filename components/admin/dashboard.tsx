import Link from "next/link";
import type { ReactNode } from "react";

/** Peças visuais do dashboard do admin (todas server components, sem JS no navegador). */

export const fmt = (n: number) => n.toLocaleString("pt-BR");

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function PeriodTabs({
  items,
  selected,
}: {
  items: { href: string; label: string; key: string }[];
  selected: string;
}) {
  return (
    <nav
      aria-label="Período"
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-smoke bg-white p-1"
    >
      {items.map((item) => {
        const active = item.key === selected;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              active ? "bg-ink text-white" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NowStrip({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-smoke rounded-2xl border border-smoke bg-white">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3 sm:px-6">
          <p className="text-xs font-medium text-muted">{item.label}</p>
          <p className="text-xl font-bold text-ink sm:text-2xl">{fmt(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  /** 0 a 100: mostra uma barra fina embaixo do número. */
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-smoke bg-white p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{value}</p>
      {progress !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-smoke">
          <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      ) : null}
      {sub ? <p className="mt-2 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-smoke bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export interface Segment {
  label: string;
  value: number;
  /** classe de cor da barra e da bolinha da legenda */
  color: string;
}

/** Barra empilhada única + legenda com quantidade e porcentagem. */
export function StackedBar({ segments, total }: { segments: Segment[]; total: number }) {
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-smoke"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
      >
        {total > 0
          ? segments.map((s) =>
              s.value > 0 ? (
                <div key={s.label} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} />
              ) : null
            )
          : null}
      </div>
      <ul className="mt-4 space-y-2.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink">
              <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
              {s.label}
            </span>
            <span className="tabular-nums text-muted">
              <span className="font-semibold text-ink">{fmt(s.value)}</span> · {pct(s.value, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha com barra proporcional (usada na lista de consultoras). */
export function BarRow({
  title,
  badge,
  value,
  max,
  right,
}: {
  title: string;
  badge?: string;
  value: number;
  max: number;
  right: string;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-ink">
          {title}
          {badge ? (
            <span className="rounded-full bg-smoke px-2 py-0.5 text-[11px] font-semibold text-muted">{badge}</span>
          ) : null}
        </span>
        <span className="tabular-nums text-muted">
          <span className="font-semibold text-ink">{fmt(value)}</span> · {right}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-smoke">
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </li>
  );
}

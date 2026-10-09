'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Pillola di stato: sempre simbolo + testo, mai solo colore ── */
export type StatusTone = 'ok' | 'warn' | 'low' | 'skipped' | 'pending' | 'crit' | 'neutral';

const TONE: Record<StatusTone, { cls: string; sym: string; label: string }> = {
  ok: { cls: 'bg-ok-bg text-ok', sym: '✓', label: 'In regola' },
  warn: { cls: 'bg-warn-bg text-warn', sym: '▲', label: 'Attenzione' },
  low: { cls: 'bg-neutral-bg text-neutral', sym: '◆', label: 'Bassa priorità' },
  skipped: { cls: 'bg-neutral-bg text-neutral', sym: '⊘', label: 'Non eseguito' },
  pending: { cls: 'bg-neutral-bg text-neutral', sym: '–', label: 'In attesa' },
  neutral: { cls: 'bg-neutral-bg text-neutral', sym: '–', label: 'Neutro' },
  crit: { cls: 'bg-crit-bg text-crit', sym: '✕', label: 'Critico' },
};

export function StatusPill({ tone, children, className }: { tone: StatusTone; children?: React.ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold', t.cls, className)}>
      <span aria-hidden="true">{t.sym}</span>
      {children ?? t.label}
    </span>
  );
}

/* ── Riga espandibile ── */
export function ExpandableRow({
  status, title, summary, value, children, defaultOpen = false, action,
}: {
  status: React.ReactNode; title: React.ReactNode; summary?: React.ReactNode; value?: React.ReactNode;
  children?: React.ReactNode; defaultOpen?: boolean; action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const expandable = Boolean(children);
  const head = (
    <>
      <span className="w-32 shrink-0">{status}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{title}</span>
        {summary && <span className="block text-[0.8125rem] text-ink-2">{summary}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 font-mono text-[0.8125rem] text-ink-2">{value}</span>}
      {expandable && <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} />}
    </>
  );
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        {expandable ? (
          <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}
            className="flex min-h-14 flex-1 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-hover sm:flex-nowrap">
            {head}
          </button>
        ) : (
          <div className="flex min-h-14 flex-1 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:flex-nowrap">{head}</div>
        )}
        {action && <div className="pr-4">{action}</div>}
      </div>
      {expandable && open && <div id={id} className="px-4 pb-4 text-sm text-ink-2 sm:pl-[10.25rem]">{children}</div>}
    </div>
  );
}

export function RowList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>{children}</div>;
}

/* ── Scheda azione numerata ── */
export function ActionCard({ n, title, why, priority, children }: {
  n: number; title: React.ReactNode; why: React.ReactNode; priority: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-lg border border-border bg-surface p-5">
      <span className="w-6 shrink-0 text-lg font-bold text-ink-2">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          {priority}
        </div>
        <p className="mt-1 text-sm text-ink-2">{why}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

/* ── Blocco comando ── */
export function CommandBlock({ command, label }: { command: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-2">
      {label && <div className="mb-1 text-[0.8125rem] text-ink-2">{label}</div>}
      <div className="flex items-stretch overflow-hidden rounded-md bg-cmd text-cmd-text">
        <pre className="m-0 flex-1 overflow-x-auto px-4 py-3 font-mono text-[0.8125rem] leading-relaxed"><code>{command}</code></pre>
        <button type="button" onClick={copy} aria-label="Copia comando"
          className="inline-flex min-h-11 min-w-16 items-center justify-center gap-1.5 border-l border-white/15 px-3 text-[0.8125rem] font-semibold hover:bg-white/10">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copiato' : 'Copia'}
        </button>
      </div>
    </div>
  );
}

/* ── Avviso (callout) ── */
export function Callout({ tone = 'warn', title, children, action }: {
  tone?: 'warn' | 'neutral' | 'ok' | 'crit'; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode;
}) {
  const cls = {
    warn: 'border-warn-border bg-warn-bg text-warn-strong',
    neutral: 'border-border bg-neutral-bg text-ink-2',
    ok: 'border-transparent bg-ok-bg text-ok',
    crit: 'border-transparent bg-crit-bg text-crit',
  }[tone];
  return (
    <div role={tone === 'warn' || tone === 'crit' ? 'alert' : 'note'} className={cn('flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm', cls)}>
      <div className="min-w-0 flex-1">
        {title && <div className="font-bold">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

/* ── Controllo segmentato ── */
export function Segmented<T extends string>({ value, onChange, options, label, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; label: string; className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-md bg-hover p-1', className)}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn('min-h-10 flex-1 rounded-[6px] px-3 text-[0.8125rem] font-semibold',
            value === o.value ? 'bg-surface text-foreground shadow-sm' : 'text-ink-2 hover:text-foreground')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Punteggio grande ── */
export function BigScore({ score, verdict, tone, children }: {
  score: number | null; verdict: React.ReactNode; tone?: 'ok' | 'warn' | 'crit' | 'neutral'; children?: React.ReactNode;
}) {
  const color = { ok: 'text-ok', warn: 'text-warn', crit: 'text-crit', neutral: 'text-foreground' }[tone ?? 'neutral'];
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <div className="flex items-baseline gap-1">
        <span className={cn('text-[4rem] font-bold leading-none sm:text-[5.5rem]', score === null ? 'text-ink-3' : color)}>
          {score === null ? '—' : score}
        </span>
        <span className="text-xl text-ink-3">/ 100</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-foreground">{verdict}</p>
        {children && <div className="mt-1 text-sm text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

/* ── Finestra modale accessibile ── */
export function Dialog({ open, onClose, title, children, footer, width = 'max-w-xl' }: {
  open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cn('w-full rounded-lg border border-border bg-surface text-foreground outline-none', width)}>
        <div className="flex items-center justify-between gap-4 border-b border-border py-2 pl-5 pr-2">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="inline-flex size-11 items-center justify-center rounded-md text-ink-2 hover:bg-hover">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Intestazione pagina ── */
export function PageHeader({ title, subtitle, aside }: { title: React.ReactNode; subtitle?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.625rem] font-bold leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-[0.9375rem] text-ink-2">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

export function SectionTitle({ children, meta }: { children: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 text-[1.0625rem] font-bold text-foreground">
      {children}{meta && <span className="font-normal text-ink-3"> · {meta}</span>}
    </h2>
  );
}

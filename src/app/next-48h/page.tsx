'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabaseClient';

type Row = {
  kickoff_utc: string; // ISO in UTC from DB
  league: string | null;
  tier: number | null;
  home: string | null;
  away: string | null;
  region: string | null;
};

const VIEW = 'v_candidates_today_public' as const; // same view; we filter to a 48h window

function toURLDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function fromURLDate(s: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputValue(v: string): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [, yyyy, mm, dd] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(d.getTime()) ? null : d;
}

function window48hUTC(d: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate());
  end.setUTCHours(end.getUTCHours() + 48);
  return { start: start.toISOString(), end: end.toISOString() };
}

function fmtWAT(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(iso));
}

export default function Next48hPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlDate = fromURLDate(searchParams.get('date'));
  const [date, setDate] = useState<Date>(urlDate ?? new Date());
  const [q, setQ] = useState<string>(searchParams.get('q') ?? '');

  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const syncURL = useCallback(
    (nextDate: Date, nextQ: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', toURLDate(nextDate));
      if (nextQ.trim()) params.set('q', nextQ.trim());
      else params.delete('q');
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    syncURL(date, qDebounced);
  }, [date, qDebounced, syncURL]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { start, end } = useMemo(() => window48hUTC(date), [date]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const orFilter = qDebounced.trim()
        ? `league.ilike.%${qDebounced}%,home.ilike.%${qDebounced}%,away.ilike.%${qDebounced}%,region.ilike.%${qDebounced}%`
        : undefined;

      let query = supabase
        .from(VIEW)
        .select('kickoff_utc,league,tier,home,away,region')
        .gte('kickoff_utc', start)
        .lt('kickoff_utc', end)
        .order('kickoff_utc', { ascending: true });

      if (orFilter) {
        // @ts-expect-error see comment in today/page.tsx
        query = query.or(`(${orFilter})`);
      }

      const { data, error } = await query;

      if (!alive.current) return;
      setLoading(false);

      if (error) {
        console.error(error);
        setRows([]);
        return;
      }
      setRows((data ?? []) as Row[]);
    };

    run();
  }, [start, end, qDebounced]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Next 48 Hours</h1>

      <div className="flex gap-3 items-center mb-4">
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={toInputValue(date)}
          onChange={(e) => {
            const d = fromInputValue

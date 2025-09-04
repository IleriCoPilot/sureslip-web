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

const VIEW = 'v_candidates_today_public' as const;

function toURLDate(d: Date): string {
  // dd-MM-yyyy
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function fromURLDate(s: string | null): Date | null {
  if (!s) return null;
  // dd-MM-yyyy
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInputValue(d: Date): string {
  // yyyy-MM-dd for <input type="date">
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputValue(v: string): Date | null {
  // yyyy-MM-dd
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [, yyyy, mm, dd] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startEndOfDayUTC(d: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start: start.toISOString(), end: end.toISOString() };
}

function fmtWAT(iso: string): string {
  // WAT (Africa/Lagos)
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(iso));
}

export default function TodayPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- URL state bootstrapping
  const urlDate = fromURLDate(searchParams.get('date'));
  const [date, setDate] = useState<Date>(urlDate ?? new Date());
  const [q, setQ] = useState<string>(searchParams.get('q') ?? '');

  // debounce (300ms)
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // keep URL in sync when date/q change
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

  // data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { start, end } = useMemo(() => startEndOfDayUTC(date), [date]);

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
        .lte('kickoff_utc', end)
        .order('kickoff_utc', { ascending: true });

      if (orFilter) {
        // Supabase 'or' needs the filter inside parentheses
        // @ts-expect-error supabase-js typing is permissive here
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
      <h1 className="text-2xl font-semibold mb-6">Today</h1>

      <div className="flex gap-3 items-center mb-4">
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={toInputValue(date)}
          onChange={(e) => {
            const d = fromInputValue(e.target.value);
            if (d) setDate(d);
          }}
        />
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2"
          placeholder="Search league / team / region"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="[&>th]:border-b [&>th]:px-3 [&>th]:py-2 text-left">
              <th>Kickoff (WAT)</th>
              <th>League</th>
              <th>Tier</th>
              <th>Home</th>
              <th>Away</th>
              <th>Region</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-2" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r, i) => (
                <tr key={`${r.kickoff_utc}-${i}`} className="[&>td]:border-b [&>td]:px-3 [&>td]:py-2">
                  <td>{fmtWAT(r.kickoff_utc)}</td>
                  <td>{r.league ?? ''}</td>
                  <td>{r.tier ?? ''}</td>
                  <td>{r.home ?? ''}</td>
                  <td>{r.away ?? ''}</td>
                  <td>{r.region ?? ''}</td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={6}>
                  No fixtures found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

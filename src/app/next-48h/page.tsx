'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  kickoff_utc: string | null; // ISO string (UTC) from DB
  league: string | null;
  tier: number | null;
  home: string | null;
  away: string | null;
  region: string | null;
};

const VIEW = 'v_candidates_next48h_public';
const WAT_TZ = 'Africa/Lagos';

// --- URL utils ---------------------------------------------------------------

function useUrlParam(
  key: string,
  {
    initial,
    debounceMs = 0,
  }: { initial: string; debounceMs?: number } = { initial: '' }
) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(() => params.get(key) ?? initial);
  const lastPushed = useRef(value);

  useEffect(() => {
    const incoming = params.get(key) ?? '';
    setValue((cur) => (cur !== incoming ? incoming : cur));
  }, [params, key]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (value === lastPushed.current) return;

      const usp = new URLSearchParams(params.toString());
      if (value) usp.set(key, value);
      else usp.delete(key);

      lastPushed.current = value;
      const query = usp.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, debounceMs);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs, key, pathname, router, params]);

  return [value, setValue] as const;
}

// --- date helpers ------------------------------------------------------------

function ddmmyyyy(date: Date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear());
  return `${d}-${m}-${y}`;
}

function yyyymmdd_to_ddmmyyyy(ymd: string) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return '';
  return `${d}-${m}-${y}`;
}

function ddmmyyyy_to_yyyymmdd(dmy: string) {
  if (!dmy) return '';
  const [d, m, y] = dmy.split('-');
  if (!y || !m || !d) return '';
  return `${y}-${m}-${d}`;
}

function isSameWATDay(utcIso: string, dmy: string) {
  if (!utcIso || !dmy) return true;
  const targetYmd = ddmmyyyy_to_yyyymmdd(dmy);
  if (!targetYmd) return true;

  const dt = new Date(utcIso);
  const local = new Date(
    dt.toLocaleString('en-US', { timeZone: WAT_TZ })
  );

  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  const ymd = `${y}-${m}-${d}`;
  return ymd === targetYmd;
}

function formatKickoffWAT(utcIso: string) {
  const dt = new Date(utcIso);
  const date = dt.toLocaleDateString('en-GB', {
    timeZone: WAT_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = dt.toLocaleTimeString('en-GB', {
    timeZone: WAT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date}, ${time}`;
}

// --- Component ---------------------------------------------------------------

export default function Next48hPage() {
  // Default date = today (WAT) so users can quickly jump days inside the window
  const [q, setQ] = useUrlParam('q', { initial: '', debounceMs: 250 });
  const [dateDmy, setDateDmy] = useUrlParam('date', {
    initial: ddmmyyyy(new Date()),
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<Row>(VIEW)
        .select('kickoff_utc,league,tier,home,away,region')
        .order('kickoff_utc', { ascending: true });
      if (!alive) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const qlc = (q ?? '').trim().toLowerCase();
    return rows.filter((r) => {
      const okDate =
        !dateDmy || (r.kickoff_utc ? isSameWATDay(r.kickoff_utc, dateDmy) : true);
      if (!qlc) return okDate;
      const hay =
        `${r.league ?? ''} ${r.home ?? ''} ${r.away ?? ''} ${r.region ?? ''}`
          .toLowerCase();
      return okDate && hay.includes(qlc);
    });
  }, [rows, q, dateDmy]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <nav className="mb-6 border-b pb-3">
        <ul className="flex gap-6 text-sm">
          <li className="font-semibold">SureSlip</li>
          <li><a href="/today">Today</a></li>
          <li><a href="/next-48h">Next 48h</a></li>
          <li><a href="/competitions">Competitions</a></li>
        </ul>
      </nav>

      <h1 className="text-2xl font-semibold mb-5">Next 48 Hours</h1>

      <div className="flex gap-3 mb-4">
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={ddmmyyyy_to_yyyymmdd(dateDmy)}
          onChange={(e) => setDateDmy(yyyymmdd_to_ddmmyyyy(e.target.value))}
          aria-label="Filter by date (WAT)"
        />
        <input
          type="text"
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search league / team / region"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Quick text filter"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border px-3 py-2 text-left">Kickoff (WAT)</th>
              <th className="border px-3 py-2 text-left">League</th>
              <th className="border px-3 py-2 text-left">Tier</th>
              <th className="border px-3 py-2 text-left">Home</th>
              <th className="border px-3 py-2 text-left">Away</th>
              <th className="border px-3 py-2 text-left">Region</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="border px-3 py-3 text-sm text-gray-500" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="border px-3 py-3 text-sm text-gray-500" colSpan={6}>
                  No matches for the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={`${r.kickoff_utc}-${i}`}>
                  <td className="border px-3 py-2">
                    {r.kickoff_utc ? formatKickoffWAT(r.kickoff_utc) : '—'}
                  </td>
                  <td className="border px-3 py-2">{r.league ?? '—'}</td>
                  <td className="border px-3 py-2">{r.tier ?? '—'}</td>
                  <td className="border px-3 py-2">{r.home ?? '—'}</td>
                  <td className="border px-3 py-2">{r.away ?? '—'}</td>
                  <td className="border px-3 py-2">{r.region ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  league: string;
  home: string;
  away: string;
  region: string | null;
  tier: number | null;
  kickoff_utc: string | null; // ISO string in UTC
};

const VIEW = 'v_candidates_today_public'; // api schema

function fmtWAT(iso: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos', // WAT
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '—';
  }
}

function localYYYYMMDD(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TodayPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState('');
  const [dateStr, setDateStr] = useState<string>(''); // YYYY-MM-DD (local)

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .schema('api')
        .from(VIEW)
        .select('*');

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      // text filter
      const textPass =
        !needle ||
        [
          r.league,
          r.home,
          r.away,
          r.region ?? '',
          (r.tier ?? '').toString(),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);

      // date filter (match local YYYY-MM-DD)
      const datePass = !dateStr || localYYYYMMDD(r.kickoff_utc) === dateStr;

      return textPass && datePass;
    });
  }, [rows, q, dateStr]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-6 border-b pb-3">Today</h1>

      <div className="flex gap-3 mb-4">
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          aria-label="Pick date"
        />
        <input
          type="text"
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search league / team / region"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Quick filter"
        />
      </div>

      {error && (
        <div className="text-red-600 mb-3">Error loading data: {error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="[&>th]:border [&>th]:px-3 [&>th]:py-2 text-left">
              <th>Kickoff (WAT)</th>
              <th>League</th>
              <th>Tier</th>
              <th>Home</th>
              <th>Away</th>
              <th>Region</th>
            </tr>
          </thead>
            <tbody>
            {loading ? (
              <tr>
                <td className="border px-3 py-2" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="border px-3 py-2" colSpan={6}>
                  No matches.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i} className="[&>td]:border [&>td]:px-3 [&>td]:py-2">
                  <td>{fmtWAT(r.kickoff_utc)}</td>
                  <td>{r.league}</td>
                  <td>{r.tier ?? '—'}</td>
                  <td>{r.home}</td>
                  <td>{r.away}</td>
                  <td>{r.region ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

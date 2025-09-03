'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const VIEW = 'v_candidates_next_48h_public';

type Row = {
  league: string | null;
  home: string | null;
  away: string | null;
HEAD
  kickoff_utc: string | null; // ISO UTC from DB

  kickoff_utc: string | null; // ISO in UTC from DB
  620e430 (feat: add quick text filter to Today & Next 48h pages)
  tier: number | null;
  region: string | null;
};

function fmtWAT(ts: string | null) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function Next48hPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
HEAD
  const [q, setQ] = useState('');

  const [query, setQuery] = useState('');
  620e430 (feat: add quick text filter to Today & Next 48h pages)

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .schema('api') // query the `api` schema
      HEAD
        .from(VIEW) // v_candidates_next_48h_public

        .from(VIEW)    // v_candidates_next_48h_public
 	620e430 (feat: add quick text filter to Today & Next 48h pages)
        .select('*')
        .order('kickoff_utc', { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as Row[]);
      setLoading(false);
    }

    load();
    const t = setInterval(load, 90_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const filtered = useMemo(() => {
  HEAD
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = [
        r.league ?? '',
        r.home ?? '',
        r.away ?? '',
        r.region ?? '',
        String(r.tier ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.league, r.home, r.away, r.region]
        .map((x) => (x ?? '').toLowerCase())
        .some((x) => x.includes(q)),
    );
  }, [rows, query]);
  620e430 (feat: add quick text filter to Today & Next 48h pages)

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Next 48 Hours</h1>

  HEAD
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fixtures… (team, league, region)"
          className="w-full max-w-sm rounded-md border px-3 py-2"
          aria-label="Search fixtures"
        />
      </div>

      {loading && <p>Loading…</p>}

      {/* Quick text filter */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search league / team / region"
        className="mb-4 w-full max-w-md rounded-md border px-3 py-2"
        aria-label="Quick filter"
      />

      {loading && <p>Loading...</p>}
      620e430 (feat: add quick text filter to Today & Next 48h pages)
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left border-b">
                <th className="p-2">Kickoff (WAT)</th>
                <th className="p-2">League</th>
                <th className="p-2">Tier</th>
                <th className="p-2">Home</th>
                <th className="p-2">Away</th>
                <th className="p-2">Region</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
 	HEAD
                <tr key={`${i}`} className="border-b hover:bg-neutral-50">

                <tr key={i} className="border-b hover:bg-neutral-50">
	620e430 (feat: add quick text filter to Today & Next 48h pages)
                  <td className="p-2">{fmtWAT(r.kickoff_utc)}</td>
                  <td className="p-2">{r.league ?? '-'}</td>
                  <td className="p-2">{r.tier ?? '-'}</td>
                  <td className="p-2">{r.home ?? '-'}</td>
                  <td className="p-2">{r.away ?? '-'}</td>
                  <td className="p-2">{r.region ?? '-'}</td>
                </tr>
              ))}
 	HEAD


 	620e430 (feat: add quick text filter to Today & Next 48h pages)
              {filtered.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={6}>
                    No fixtures in the next 48 hours.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

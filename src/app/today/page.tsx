'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const VIEW = 'v_candidates_today_public';

type Row = {
  league: string | null;
  home: string | null;
  away: string | null;
  kickoff_utc: string | null; // ISO string in UTC from DB
  tier: number | null;
  region: string | null;
};

function fmtWAT(ts: string | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts; // safety fallback

  // West Africa Time (Africa/Lagos)
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

export default function TodayPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .schema('api') // query the `api` schema
        .from(VIEW) // v_candidates_today_public
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
    const t = setInterval(load, 90_000); // refresh every 90s
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Today</h1>

      {loading && <p>Loading…</p>}
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
              {rows.map((r, i) => (
                <tr key={i} className="border-b hover:bg-neutral-50">
                  <td className="p-2">{fmtWAT(r.kickoff_utc)}</td>
                  <td className="p-2">{r.league ?? '—'}</td>
                  <td className="p-2">{r.tier ?? '—'}</td>
                  <td className="p-2">{r.home ?? '—'}</td>
                  <td className="p-2">{r.away ?? '—'}</td>
                  <td className="p-2">{r.region ?? '—'}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={6}>
                    No fixtures today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

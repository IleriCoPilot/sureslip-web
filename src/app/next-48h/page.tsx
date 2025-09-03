'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  league: string;
  home: string;
  away: string;
  kickoff_utc: string | null; // ISO string from DB (UTC)
  tier: number | null;
  region: string | null;
};

const VIEW = 'v_candidates_next_48h_public';
const WAT_TZ = 'Africa/Lagos';

function fmtWAT(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: WAT_TZ,
  }).format(d);
}

function dateKeyWAT(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: WAT_TZ,
  }).format(d);
}

export default function Next48hPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [pickedDate, setPickedDate] = useState(''); // yyyy-mm-dd

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .schema('api')
        .from(VIEW)
        .select('*')
        .order('kickoff_utc', { ascending: true });

      if (cancel) return;
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
      cancel = true;
      clearInterval(t);
    };
  }, []);

  const filtered = useMemo(() => {
    const qx = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesText =
        !qx ||
        [r.league, r.home, r.away, r.region ?? '', String(r.tier ?? '')]
          .join(' ')
          .toLowerCase()
          .includes(qx);

      const matchesDate = !pickedDate || dateKeyWAT(r.kickoff_utc) === pickedDate;

      return matchesText && matchesDate;
    });
  }, [rows, q, pickedDate]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Next 48 Hours</h1>

      <div className="flex gap-3 mb-4">
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={pickedDate}
          onChange={(e) => setPickedDate(e.target.value)}
          placeholder="yyyy-mm-dd"
        />
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2"
          placeholder="Search league / team / region"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-[720px] border rounded-lg">
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
              <tr key={`${r.league}-${r.home}-${r.away}-${i}`} className="border-b hover:bg-neutral-50">
                <td className="p-2 whitespace-nowrap">{fmtWAT(r.kickoff_utc)}</td>
                <td className="p-2">{r.league}</td>
                <td className="p-2">{r.tier ?? ''}</td>
                <td className="p-2">{r.home}</td>
                <td className="p-2">{r.away}</td>
                <td className="p-2">{r.region ?? ''}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td className="p-4 text-neutral-600" colSpan={6}>
                  No rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

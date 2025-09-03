'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { CompetitionRow } from '@/types/db';
import Select from '@/components/Select';

const VIEW = 'v_competitions_public';

export default function CompetitionsPage() {
  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState('all');
  const [confed, setConfed] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      const { data, error } = await supabase
	.schema('api')
   	.from(VIEW)
        .select('code,name,region,confederation,tier,competition,season')
        .order('tier', { ascending: true })
        .order('name', { ascending: true });
      if (cancelled) return;
      if (error) { setError(error.message); setLoading(false); return; }
      setRows((data ?? []) as CompetitionRow[]); setLoading(false);
    }
    load();
    const t = setInterval(load, 90_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const filtered = useMemo(() => rows.filter(r =>
    (region === 'all' || (r.region ?? '').toLowerCase() === region) &&
    (confed === 'all' || (r.confederation ?? '').toLowerCase() === confed)
  ), [rows, region, confed]);

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Competitions</h1>
      <div className="flex gap-4 mb-4">
        <Select label="Region" value={region} onChange={setRegion} options={[
          { value: 'all', label: 'All' },
          { value: 'europe', label: 'Europe' },
          { value: 'africa', label: 'Africa' },
          { value: 'asia', label: 'Asia' },
          { value: 'south america', label: 'South America' },
          { value: 'north/central america', label: 'North/Central America' },
          { value: 'oceania', label: 'Oceania' },
        ]}/>
        <Select label="Confed" value={confed} onChange={setConfed} options={[
          { value: 'all', label: 'All' },
          { value: 'uefa', label: 'UEFA' },
          { value: 'caf', label: 'CAF' },
          { value: 'afc', label: 'AFC' },
          { value: 'conmebol', label: 'CONMEBOL' },
          { value: 'concacaf', label: 'CONCACAF' },
          { value: 'ofc', label: 'OFC' },
        ]}/>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left border-b">
                <th className="p-2">Code</th><th className="p-2">Name</th>
                <th className="p-2">Region</th><th className="p-2">Confed</th>
                <th className="p-2">Tier</th><th className="p-2">Competition</th>
                <th className="p-2">Season</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={`${r.code}-${r.season}`} className="border-b hover:bg-neutral-50">
                  <td className="p-2">{r.code}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.region ?? '—'}</td>
                  <td className="p-2">{r.confederation ?? '—'}</td>
                  <td className="p-2">{r.tier ?? '—'}</td>
                  <td className="p-2">{r.competition ?? '—'}</td>
                  <td className="p-2">{r.season ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td className="p-2" colSpan={7}>No rows.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

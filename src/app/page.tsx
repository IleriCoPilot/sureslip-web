'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  code: string;
  name: string;
  region: string;
  confederation: string;
  tier: number;
  competition: string;
  season: string;
};

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('v_competitions_public')
        .select('code,name,region,confederation,tier,competition,season')
        .order('tier', { ascending: true })
        .order('name', { ascending: true })
        .limit(50);

      if (error) setError(error.message);
      else setRows((data ?? []) as Row[]);
    })();
  }, []);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Competitions (public)</h1>
      {error && <p className="text-red-600">Error: {error}</p>}
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">code</th>
            <th className="py-2 pr-3">name</th>
            <th className="py-2 pr-3">region</th>
            <th className="py-2 pr-3">confederation</th>
            <th className="py-2 pr-3">tier</th>
            <th className="py-2 pr-3">competition</th>
            <th className="py-2 pr-3">season</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b/50">
              <td className="py-2 pr-3">{r.code}</td>
              <td className="py-2 pr-3">{r.name}</td>
              <td className="py-2 pr-3">{r.region}</td>
              <td className="py-2 pr-3">{r.confederation}</td>
              <td className="py-2 pr-3">{r.tier}</td>
              <td className="py-2 pr-3">{r.competition}</td>
              <td className="py-2 pr-3">{r.season}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


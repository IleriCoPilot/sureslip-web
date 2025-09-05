'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const VIEW = 'v_candidates_today_public'; // DB view returning today's fixtures (UTC source, shown in WAT)

// ----- Types -----
type Row = {
  kickoff_utc: string | null; // ISO UTC string from DB
  league: string | null;
  tier: number | null;
  home: string | null;
  away: string | null;
  region: string | null;
};

// ----- Date helpers (URL ↔ input) -----
const TZ = 'Africa/Lagos'; // WAT

function formatDateInput(d: Date): string {
  // dd/mm/yyyy
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDateInput(v: string): Date | null {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toUrlDateFromInput(input: string): string | null {
  const d = parseDateInput(input);
  if (!d) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  // dd-mm-yyyy
  return `${dd}-${mm}-${yyyy}`;
}

function fromUrlDateToInput(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  return `${dd}/${mm}/${yyyy}`;
}

// ----- Kickoff formatting in WAT -----
function formatKickoffWAT(isoUtc: string | null): string {
  if (!isoUtc) return '';
  // Use Intl with explicit timeZone to show WAT
  const d = new Date(isoUtc);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${date}, ${time}`;
}

export default function TodayPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state → controls
  const urlDate = searchParams.get('date'); // dd-mm-yyyy
  const urlQ = searchParams.get('q') ?? '';

  // Controls
  const [dateInput, setDateInput] = useState<string>(() => {
    const v = fromUrlDateToInput(urlDate);
    if (v) return v;
    // default = "today" in TZ for visual; value is only used for filtering on the client
    const now = new Date();
    return formatDateInput(now);
  });
  const [query, setQuery] = useState(urlQ);

  // Debounce search → 350ms
  const [debouncedQ, setDebouncedQ] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Keep URL in sync when date changes
  const pushUrl = useCallback(
    (nextDateInput: string, nextQ: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // date
      const urlDateVal = toUrlDateFromInput(nextDateInput);
      if (urlDateVal) params.set('date', urlDateVal);
      else params.delete('date');
      // q
      if (nextQ) params.set('q', nextQ);
      else params.delete('q');

      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // When search changes (debounced), sync URL
  const firstQSync = useRef(true);
  useEffect(() => {
    // skip first run if URL already had q
    if (firstQSync.current) {
      firstQSync.current = false;
      return;
    }
    pushUrl(dateInput, debouncedQ);
  }, [debouncedQ, dateInput, pushUrl]);

  // When URL changes externally (back/forward), keep controls in sync
  useEffect(() => {
    const v = fromUrlDateToInput(urlDate);
    if (v && v !== dateInput) setDateInput(v);
    const newQ = urlQ ?? '';
    if (newQ !== query) setQuery(newQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDate, urlQ]);

  // Data loading
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(VIEW) // no generics to satisfy CI typing
      .select('kickoff_utc,league,tier,home,away,region')
      .order('kickoff_utc', { ascending: true });
    if (!error) setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Client-side filters (date + q)
  const filtered = useMemo(() => {
    const q = debouncedQ.trim().toLowerCase();
    const dSel = parseDateInput(dateInput); // local date (not time-zone shifted)
    return rows.filter((r) => {
      // Text filter
      if (q) {
        const blob = [
          r.league,
          r.home,
          r.away,
          r.region,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      // Date filter (compare by WAT calendar day)
      if (dSel && r.kickoff_utc) {
        const dt = new Date(r.kickoff_utc);
        const dStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: TZ,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(dt); // yyyy? no — en-GB gives dd/mm/yyyy
        if (dStr !== dateInput) return false;
      }
      return true;
    });
  }, [rows, debouncedQ, dateInput]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Today</h1>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          className="border rounded px-3 py-2 w-40"
          value={dateInput}
          onChange={(e) => {
            const next = e.target.value;
            setDateInput(next);
            // push immediately for date (no debounce)
            pushUrl(next, debouncedQ);
          }}
        />
        <input
          type="search"
          placeholder="Search league / team / region"
          className="border rounded px-3 py-2 flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 border-b">
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
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-2" colSpan={6}>
                  No fixtures found.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((r, i) => (
                <tr key={`${r.kickoff_utc ?? ''}-${i}`} className="border-t">
                  <td className="px-3 py-2">{formatKickoffWAT(r.kickoff_utc)}</td>
                  <td className="px-3 py-2">{r.league}</td>
                  <td className="px-3 py-2">{r.tier ?? ''}</td>
                  <td className="px-3 py-2">{r.home}</td>
                  <td className="px-3 py-2">{r.away}</td>
                  <td className="px-3 py-2">{r.region}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

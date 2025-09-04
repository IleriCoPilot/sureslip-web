"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // named export
// This view is your public “today” candidates
const VIEW = "v_candidates_today_public";

type Row = {
  league: string | null;
  home: string | null;
  away: string | null;
  kickoff_utc: string | null; // ISO string from DB
  tier: number | null;
  region: string | null;
};

function sameLocalDate(iso: string | null, ymd: string): boolean {
  if (!iso) return false;
  // ymd is "YYYY-MM-DD" from <input type="date">
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(iso);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() + 1 === m &&
    dt.getDate() === d
  );
}

export default function TodayPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filterDate, setFilterDate] = useState<string>(""); // YYYY-MM-DD
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .schema("api")
        .from(VIEW)
        .select("*");
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const qnorm = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchText =
        !qnorm ||
        [r.league, r.home, r.away, r.region]
          .map((v) => (v ?? "").toLowerCase())
          .some((v) => v.includes(qnorm));

      const matchDate =
        !filterDate || sameLocalDate(r.kickoff_utc, filterDate);

      return matchText && matchDate;
    });
  }, [rows, q, filterDate]);

  return (
    <main style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Today</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          aria-label="Pick a date"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{
            height: 36,
            padding: "0 10px",
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
        <input
          aria-label="Search"
          type="text"
          placeholder="Search league / team / region"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: 1,
            height: 36,
            padding: "0 12px",
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: "crimson" }}>Error: {error}</div>}

      {!loading && !error && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #ddd",
          }}
        >
          <thead>
            <tr>
              {["Kickoff (WAT)", "League", "Tier", "Home", "Away", "Region"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const kickoff = r.kickoff_utc
                ? new Date(r.kickoff_utc).toLocaleString("en-GB", {
                    hour12: false,
                    timeZoneName: undefined,
                  })
                : "";
              return (
                <tr key={i}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                    {kickoff}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                    {r.league ?? ""}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                    {r.tier ?? ""}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                    {r.home ?? ""}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                    {r.away ?? ""}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f2f2f2" }}>
                    {r.region ?? ""}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "#666" }}>
                  No matches for your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}

// src/utils/time.ts
export const fmtWAT = (iso: string) =>
  new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',           // West Africa Time (WAT)
    weekday: 'short', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  }).format(new Date(iso));

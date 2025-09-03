'use client';
type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
};
export default function Select({ label, value, onChange, options }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-600">{label}</span>
      <select
        className="border rounded-md px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

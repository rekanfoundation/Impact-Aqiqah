export function KpiCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-800">
        {value}
        {suffix && <span className="ml-0.5 text-base text-neutral-400">{suffix}</span>}
      </div>
    </div>
  );
}

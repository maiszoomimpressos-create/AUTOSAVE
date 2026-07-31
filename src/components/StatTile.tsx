export default function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        {icon && <span aria-hidden>{icon}</span>}
        {label}
      </div>
      <span className="text-3xl font-semibold tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}

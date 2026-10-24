import Link from "next/link";
import NavIcon from "@/components/NavIcon";

export default function StatTile({
  label,
  value,
  icon,
  href,
  hint,
}: {
  label: string;
  value: number | string;
  icon?: string;
  href?: string;
  hint?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-muted">{label}</span>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <NavIcon name={icon} />
          </span>
        )}
      </div>
      <span className="text-3xl font-semibold tracking-tight tabular-nums text-ink">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </>
  );
  const cls = "card flex flex-col gap-3 p-5";
  return href ? (
    <Link href={href} className={`${cls} transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

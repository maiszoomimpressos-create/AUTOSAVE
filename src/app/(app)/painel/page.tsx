import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import StatTile from "@/components/StatTile";
import NavIcon from "@/components/NavIcon";

const SHORTCUTS = [
  { href: "/veiculos", icon: "car", title: "Veículos", text: "Cadastre e consulte placas da frota." },
  { href: "/cadastros", icon: "users", title: "Usuários", text: "Clientes PF e PJ cadastrados." },
  { href: "/enderecos", icon: "pin", title: "Endereços", text: "Locais salvos pela busca da API." },
  { href: "/api-docs", icon: "plug", title: "API", text: "Chaves de parceiros e documentação." },
  { href: "/relatorios", icon: "chart", title: "Relatórios", text: "Consultas de placa e custos." },
  { href: "/saldo", icon: "wallet", title: "Saldo", text: "Créditos e alertas da APIBrasil." },
];

export default async function Home() {
  const supabase = createAdminClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  const [{ count: vehicleCount }, { count: customerCount }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <h1 className="page-title">Bem-vindo</h1>
        <p className="page-subtitle">Visão geral do seu workspace e atalhos para as áreas principais.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Usuários cadastrados" value={customerCount ?? 0} icon="users" href="/cadastros" />
        <StatTile label="Veículos cadastrados" value={vehicleCount ?? 0} icon="car" href="/veiculos" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">Acesso rápido</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="card group flex items-start gap-3 p-4 transition hover:border-line-strong hover:shadow-pop"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-muted transition group-hover:bg-accent-soft group-hover:text-accent">
                <NavIcon name={s.icon} />
              </span>
              <span className="flex flex-col">
                <span className="font-medium text-ink">{s.title}</span>
                <span className="text-sm text-ink-muted">{s.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

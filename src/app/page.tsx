import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/workspace";
import { isExternalClient } from "@/lib/roles";
import LandingNav from "@/components/LandingNav";

const FEATURES = [
  {
    icon: "🚗",
    title: "Veículos",
    description:
      "Cadastro completo da frota, com histórico, status e busca rápida por placa.",
  },
  {
    icon: "🙍",
    title: "Clientes",
    description:
      "Dados de contato e documentos organizados por cliente, sempre à mão.",
  },
  {
    icon: "🏢",
    title: "Empresas",
    description:
      "Vincule veículos e contatos a empresas parceiras e mantenha tudo relacionado.",
  },
  {
    icon: "🔎",
    title: "Consulta de placa",
    description:
      "Consulta rápida na sua base, com fallback automático quando não encontra.",
  },
  {
    icon: "☁️",
    title: "Backup automático",
    description:
      "Tudo sincronizado e protegido na nuvem — nada fica dependendo só do seu dispositivo.",
  },
  {
    icon: "🔌",
    title: "API própria",
    description:
      "Gere chaves de API e integre a sua frota e cadastros aos seus próprios sistemas.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Cadastre-se",
    description: "Crie sua conta e monte seu workspace em menos de um minuto.",
  },
  {
    number: "2",
    title: "Importe seus dados",
    description:
      "Cadastre veículos, clientes e empresas — tudo já sincronizado na nuvem.",
  },
  {
    number: "3",
    title: "Acesse de qualquer lugar",
    description:
      "Instale como app, gere chaves de API ou convide parceiros para o portal externo.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await getMemberRole(user.id) : null;
  const appHref = isExternalClient(role) ? "/portal" : "/painel";

  return (
    <div className="flex flex-1 flex-col bg-paper">
      <LandingNav loggedIn={!!user} appHref={appHref} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-deep">
        <div
          className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-brand-glow/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand/30 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pb-20 pt-16 text-center sm:pt-20">
          <Image
            src="/logo-mark.png"
            alt="AutoSave"
            width={88}
            height={88}
            className="h-20 w-20 rounded-2xl shadow-lg shadow-black/30 sm:h-22 sm:w-22"
            priority
          />

          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Sua frota, seus clientes e seus documentos, sempre salvos na nuvem
          </h1>

          <p className="max-w-xl text-base text-white/75 sm:text-lg">
            O AutoSave centraliza cadastro de veículos, clientes e empresas com
            backup automático, consulta de placa e API própria — tudo em um
            só lugar, protegido e acessível de qualquer dispositivo.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link
                href={appHref}
                className="rounded-lg bg-brand-glow px-6 py-3 text-sm font-semibold text-brand-deep transition hover:brightness-95"
              >
                Ir para o painel
              </Link>
            ) : (
              <>
                <Link
                  href="/cadastro"
                  className="rounded-lg bg-brand-glow px-6 py-3 text-sm font-semibold text-brand-deep transition hover:brightness-95"
                >
                  Criar conta grátis
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            Recursos
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Tudo que sua operação precisa, num só sistema
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-3 rounded-xl border border-line bg-elevated p-6 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-xl">
                {feature.icon}
              </span>
              <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
              <p className="text-sm text-ink-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-elevated">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
          <div className="mb-10 flex flex-col gap-2 text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-brand">
              Como funciona
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Comece em três passos
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-ink">
                  {step.number}
                </span>
                <h3 className="text-base font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + contato */}
      <section
        id="contato"
        className="relative overflow-hidden bg-brand-deep px-6 py-16 text-center sm:py-20"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full bg-brand-glow/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Pronto para tirar sua frota das planilhas?
          </h2>
          <p className="text-sm text-white/75 sm:text-base">
            Crie sua conta gratuitamente ou fale com a gente para conhecer o
            portal de parceiros e a API do AutoSave.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link
                href={appHref}
                className="rounded-lg bg-brand-glow px-6 py-3 text-sm font-semibold text-brand-deep transition hover:brightness-95"
              >
                Ir para o painel
              </Link>
            ) : (
              <Link
                href="/cadastro"
                className="rounded-lg bg-brand-glow px-6 py-3 text-sm font-semibold text-brand-deep transition hover:brightness-95"
              >
                Criar conta grátis
              </Link>
            )}
            <a
              href="mailto:maiszoomimpressos@gmail.com"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Falar com a gente
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-brand-deep px-6 pb-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 border-t border-white/10 pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-mark.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-md"
              aria-hidden
            />
            <span className="text-sm font-semibold text-white">AutoSave</span>
          </div>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} AutoSave. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

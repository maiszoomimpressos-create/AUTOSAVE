import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <span className="text-5xl font-semibold tracking-tight text-accent">404</span>
      <h1 className="text-lg font-semibold text-ink">Página não encontrada</h1>
      <p className="text-sm text-ink-muted">O endereço pode ter mudado ou não existe mais.</p>
      <Link href="/" className="btn-primary mt-2">
        Voltar ao início
      </Link>
    </div>
  );
}

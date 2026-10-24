"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600" aria-hidden>
        !
      </span>
      <h1 className="text-lg font-semibold text-ink">Algo deu errado ao carregar esta página</h1>
      <p className="text-sm text-ink-muted">
        Tente de novo. Se o problema continuar, avise o administrador
        {error.digest ? ` (código ${error.digest})` : ""}.
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-2">
        Tentar novamente
      </button>
    </div>
  );
}

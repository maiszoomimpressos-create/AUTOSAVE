import NavIcon from "@/components/NavIcon";

const POINTS = [
  { icon: "car", text: "Frota, clientes e documentos num só lugar" },
  { icon: "search", text: "Consulta de placa com cache próprio" },
  { icon: "cloud", text: "Tudo salvo na nuvem, acessível de qualquer dispositivo" },
  { icon: "plug", text: "API para integrar seus sistemas" },
];

// Layout das telas de autenticação: painel da marca à esquerda (desktop) e
// formulário à direita; no mobile, só o formulário.
export default function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-deep p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-glow/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand/40 blur-3xl" aria-hidden />
        <span className="relative text-sm font-semibold uppercase tracking-widest text-brand-glow">AutoSave</span>
        <div className="relative flex flex-col gap-8">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            Sua operação organizada e sempre salva.
          </h2>
          <ul className="flex flex-col gap-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-white/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-brand-glow">
                  <NavIcon name={p.icon} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">© AutoSave</p>
      </aside>
      <div className="flex flex-col items-center justify-center gap-6 bg-paper px-4 py-12">{children}</div>
    </div>
  );
}

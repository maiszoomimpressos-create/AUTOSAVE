import { signOut } from "@/app/(app)/actions";

export default function TopBar({ email }: { email?: string }) {
  return (
    <header className="sticky top-4 z-10 mx-4 mb-6 flex items-center justify-between rounded-xl border border-line bg-elevated/90 px-5 py-3 shadow-sm backdrop-blur">
      <span className="text-sm font-medium text-ink-muted">Painel</span>

      <div className="flex items-center gap-4">
        <span className="text-sm text-ink">{email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}

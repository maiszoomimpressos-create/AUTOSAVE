import { signOut } from "@/app/(app)/actions";

export default function TopBar({
  email,
  onMenuClick,
}: {
  email?: string;
  onMenuClick?: () => void;
}) {
  return (
    <header className="sticky top-2 z-10 mx-2 mb-6 flex items-center justify-between gap-3 rounded-xl border border-line bg-elevated/90 px-3 py-3 shadow-sm backdrop-blur sm:top-4 sm:mx-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-ink hover:bg-paper lg:hidden"
        >
          ☰
        </button>
        <span className="hidden text-sm font-medium text-ink-muted sm:inline">
          Painel
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <span className="max-w-[9rem] truncate text-sm text-ink sm:max-w-none">{email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="whitespace-nowrap rounded-md border border-line px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-paper sm:px-3"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}

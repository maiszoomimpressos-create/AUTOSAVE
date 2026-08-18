import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/actions";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-full bg-paper">
      <header className="sticky top-2 z-10 mx-2 mb-6 flex items-center justify-between gap-3 rounded-xl border border-line bg-elevated/90 px-3 py-3 shadow-sm backdrop-blur sm:top-4 sm:mx-4 sm:px-5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-ink-muted">Portal</span>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/portal/pedir-api" className="text-ink hover:text-accent">
              Pedir API
            </Link>
            <Link href="/portal/perfil" className="text-ink hover:text-accent">
              Perfil
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden max-w-[10rem] truncate text-sm text-ink sm:inline">
            {user?.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-line px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-paper sm:px-3"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="px-2 pb-8 sm:px-4">{children}</main>
    </div>
  );
}

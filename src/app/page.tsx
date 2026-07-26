import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <p className="text-lg text-zinc-800 dark:text-zinc-100">
        Logado como <strong>{user?.email}</strong>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          Sair
        </button>
      </form>
    </div>
  );
}

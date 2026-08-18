import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { deniedReason, homeHrefFor } from "@/lib/workspace";

// "/" é a landing page pública — visível logada ou não. /login e /cadastro
// também são públicas, mas além disso escondidas de quem já está logado
// (ver AUTH_ROUTES abaixo).
const PUBLIC_ROUTES = ["/", "/login", "/cadastro"];
const AUTH_ROUTES = ["/login", "/cadastro"];

function matchesRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    matchesRoute(request.nextUrl.pathname, route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    matchesRoute(request.nextUrl.pathname, route),
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let isClient = false;

  if (user && !isPublicRoute) {
    const admin = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Busca sem filtrar por status pra poder diferenciar "nunca pediu
    // acesso" de "pediu e tá esperando aprovação" na mensagem de volta.
    const { data: membership } = await admin
      .from("workspace_members")
      .select("role, status")
      .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.status !== "active") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("denied", deniedReason(membership?.status));
      return NextResponse.redirect(url);
    }

    isClient = membership.role === "client";

    // Cliente externo só pode ver o próprio portal (/portal) — nunca as
    // telas internas de gestão de frota/cadastros/membros/API. Isso é o
    // ponto único que barra tudo; cada página interna também confere por
    // conta própria, como defesa extra.
    if (isClient && !request.nextUrl.pathname.startsWith("/portal")) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
  }

  // Quem já está logado não precisa ver login/cadastro — mas a landing
  // page em "/" continua visível pra quem já tem sessão.
  if (user && isAuthRoute) {
    const admin = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: membership } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = membership ? homeHrefFor(membership.role) : "/login";
    if (!membership) url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // sw.js e manifest.webmanifest precisam ficar acessíveis sem sessão —
    // o navegador registra o service worker e lê o manifest do PWA a
    // qualquer momento, inclusive na tela de login.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse } from "next/server";
import { checkAndSendBalanceAlert } from "@/lib/balance-alert";

// Rede de segurança: dispara pela Vercel (ver vercel.json) 1x por dia — mas
// o gatilho principal já não é esse. Toda consulta paga na APIBrasil (ver
// plate-lookup.ts) chama checkAndSendBalanceAlert() na hora, porque é
// exatamente aí que o saldo muda. Esse cron só cobre o caso do saldo cair
// por outro motivo (fora da nossa tela) sem nenhuma consulta acontecer.
//
// A Vercel injeta o próprio CRON_SECRET configurado no projeto no header
// Authorization — batendo essa rota de fora sem o segredo certo dá 401.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await checkAndSendBalanceAlert();
  return NextResponse.json({ ok: true });
}

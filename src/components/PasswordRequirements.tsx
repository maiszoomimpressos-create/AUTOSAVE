import { PASSWORD_REQUIREMENTS } from "@/lib/password";

// Checklist ao vivo — mostra pro usuário exatamente o que já cumpriu (✓
// verde) e o que ainda falta (○ cinza), em vez de só uma dica estática.
export default function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="flex flex-col gap-0.5 text-xs">
      {PASSWORD_REQUIREMENTS.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 transition-colors ${
              met ? "text-green-700" : "text-ink-muted"
            }`}
          >
            <span aria-hidden>{met ? "✓" : "○"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

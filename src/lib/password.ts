// Padrão de senha único do app: mínimo 6 caracteres, com maiúscula,
// minúscula, número e caractere especial. Usado no cadastro e em qualquer
// tela de troca de senha — mude aqui pra mudar em todo lugar de uma vez.
export const PASSWORD_HINT =
  "Mínimo 6 caracteres, com maiúscula, minúscula, número e caractere especial.";

export const PASSWORD_PATTERN =
  "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{6,}";

// Cada regra separada (em vez de só um "senha fraca") pra dar pro usuário um
// checklist ao vivo mostrando o que já cumpriu e o que falta.
export const PASSWORD_REQUIREMENTS: { label: string; test: (password: string) => boolean }[] = [
  { label: "Pelo menos 6 caracteres", test: (p) => p.length >= 6 },
  { label: "Uma letra maiúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Uma letra minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Um número", test: (p) => /[0-9]/.test(p) },
  { label: "Um caractere especial", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function isStrongPassword(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((rule) => rule.test(password));
}

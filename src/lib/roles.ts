export const ADMIN_ROLES = ["owner", "admin"] as const;

export function canManageMembers(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

export const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "fleet_manager", label: "Gestor de frota" },
  { value: "dispatcher", label: "Despachante" },
  { value: "driver", label: "Motorista" },
  { value: "mechanic", label: "Mecânico" },
  { value: "financial", label: "Financeiro" },
  { value: "operator", label: "Operador" },
  { value: "viewer", label: "Visualizador" },
] as const;

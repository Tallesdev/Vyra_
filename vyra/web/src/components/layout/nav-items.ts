import {
  Clock,
  Columns3,
  GitBranch,
  LayoutDashboard,
  Mail,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Papéis autorizados; ausente = todos. */
  roles?: Role[];
  /** Chave da contagem exibida como badge (resolvida no componente). */
  badge?: "ociosos";
}

export const navPrincipal: NavItem[] = [
  { href: "/dashboard", rotulo: "Dashboard", icone: LayoutDashboard },
  { href: "/kanban", rotulo: "Funil", icone: Columns3 },
  { href: "/leads", rotulo: "Leads", icone: Users },
  {
    href: "/ociosos",
    rotulo: "Ociosos",
    icone: Clock,
    roles: ["ADMIN", "GERENTE"],
    badge: "ociosos",
  },
];

export const navGestao: NavItem[] = [
  {
    href: "/usuarios",
    rotulo: "Equipe",
    icone: UsersRound,
    roles: ["ADMIN", "GERENTE"],
  },
  {
    href: "/pipelines",
    rotulo: "Pipelines",
    icone: GitBranch,
    roles: ["ADMIN", "GERENTE"],
  },
  { href: "/templates", rotulo: "Templates", icone: Mail },
];

export function podeVer(item: NavItem, role?: Role) {
  if (!item.roles) return true;
  return role ? item.roles.includes(role) : false;
}

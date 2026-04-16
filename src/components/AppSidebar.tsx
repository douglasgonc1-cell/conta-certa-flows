import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Repeat,
  CreditCard,
  Download,
  BarChart3,
  Users,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: AppRole[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard size={20} />, roles: ["admin", "financeiro", "unimed_consulta", "usuario"] },
  { label: "Unimeds", path: "/unimeds", icon: <Building2 size={20} />, roles: ["admin", "financeiro"] },
  { label: "Tipos ND", path: "/tipos-nd", icon: <FileText size={20} />, roles: ["admin", "financeiro"] },
  { label: "Parâmetros", path: "/parametros", icon: <Settings size={20} />, roles: ["admin"] },
  { label: "Encontros", path: "/encontros", icon: <Repeat size={20} />, roles: ["admin", "financeiro", "unimed_consulta", "usuario"] },
  { label: "Notas de Débito", path: "/notas-debito", icon: <CreditCard size={20} />, roles: ["admin", "financeiro", "unimed_consulta", "usuario"] },
  { label: "Parcelamentos", path: "/parcelamentos", icon: <BarChart3 size={20} />, roles: ["admin", "financeiro"] },
  { label: "Exportação", path: "/exportacao", icon: <Download size={20} />, roles: ["admin", "financeiro"] },
  {
    label: "Relatórios", path: "/relatorios", icon: <BarChart3 size={20} />, roles: ["admin", "financeiro", "unimed_consulta"],
    children: [
      { label: "Parcelamentos", path: "/relatorios/parcelamentos", icon: <BarChart3 size={16} />, roles: ["admin", "financeiro"] },
      { label: "Nota Débito", path: "/relatorios/notas-debito", icon: <FileText size={16} />, roles: ["admin", "financeiro", "unimed_consulta"] },
      { label: "Demonstrativo Sintético", path: "/relatorios/sintetico", icon: <BarChart3 size={16} />, roles: ["admin", "financeiro", "unimed_consulta"] },
      { label: "Demonstrativo Tipo Nota", path: "/relatorios/tipo-nota", icon: <FileText size={16} />, roles: ["admin", "financeiro", "unimed_consulta"] },
      { label: "Cobrança Eventos", path: "/relatorios/cobranca-eventos", icon: <CreditCard size={16} />, roles: ["admin", "financeiro"] },
    ],
  },
  { label: "Auditoria", path: "/auditoria", icon: <Shield size={20} />, roles: ["admin", "financeiro"] },
  { label: "Usuários", path: "/usuarios", icon: <Users size={20} />, roles: ["admin"] },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const { hasAnyRole, signOut, user } = useAuth();
  const location = useLocation();

  const toggleExpand = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const filteredItems = navItems.filter((item) => hasAnyRole(...item.roles));

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
          AC
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="truncate text-sm font-bold">Achilles</h2>
            <p className="truncate text-xs text-sidebar-foreground/60">GesContas</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus.includes(item.label);

          if (hasChildren) {
            const filteredChildren = item.children!.filter((c) => hasAnyRole(...c.roles));
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent",
                    isActive && "bg-sidebar-accent text-sidebar-primary"
                  )}
                >
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight size={14} className={cn("transition-transform", isExpanded && "rotate-90")} />
                    </>
                  )}
                </button>
                {isExpanded && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {filteredChildren.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-sidebar-accent",
                          location.pathname === child.path && "bg-sidebar-accent text-sidebar-primary font-medium"
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent",
                isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Recolher</span>}
        </button>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-destructive transition-colors hover:bg-sidebar-accent"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;

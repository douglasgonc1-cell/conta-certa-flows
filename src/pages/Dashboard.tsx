import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

const Dashboard = () => {
  const { user, roles } = useAuth();

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao Achilles — Sistema de Gestão de Encontro de Contas
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title="Encontros Abertos" value="—" />
          <DashboardCard title="NDs Pendentes" value="—" />
          <DashboardCard title="Exportações" value="—" />
          <DashboardCard title="Parcelamentos Ativos" value="—" />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Usuário: <span className="font-medium text-foreground">{user?.email}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Perfis: <span className="font-medium text-foreground">{roles.join(", ") || "Nenhum"}</span>
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

const DashboardCard = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
    <p className="text-xs font-medium text-muted-foreground">{title}</p>
    <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
  </div>
);

export default Dashboard;

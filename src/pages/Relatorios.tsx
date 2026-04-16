import AppLayout from "@/components/AppLayout";

const ReportPlaceholder = ({ title, description }: { title: string; description: string }) => (
  <AppLayout>
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-muted-foreground">{description}</p></div>
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        Em desenvolvimento — filtros e dados serão implementados na próxima iteração.
      </div>
    </div>
  </AppLayout>
);

export const RelParcelamentos = () => <ReportPlaceholder title="Relatório de Parcelamentos" description="Consulta de acordos de pagamento parcelados entre Unimeds" />;
export const RelNotasDebito = () => <ReportPlaceholder title="Relatório de Notas de Débito" description="Consulta e controle de notas de débito emitidas" />;
export const RelSintetico = () => <ReportPlaceholder title="Demonstrativo Sintético" description="Resumo consolidado financeiro entre Unimeds" />;
export const RelTipoNota = () => <ReportPlaceholder title="Demonstrativo por Tipo de Nota" description="Detalhamento de valores por tipo de nota" />;
export const RelCobrancaEventos = () => <ReportPlaceholder title="Cobrança de Eventos" description="Consulta de eventos individuais que geraram cobrança" />;

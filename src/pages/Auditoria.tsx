import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Auditoria = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*, profiles:user_id(full_name, email)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div><h1 className="text-2xl font-bold">Auditoria</h1><p className="text-muted-foreground">Registro de ações no sistema</p></div>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : logs?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : (
                logs?.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs font-mono">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{(l.profiles as any)?.full_name || (l.profiles as any)?.email || "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{l.acao}</TableCell>
                    <TableCell className="text-xs font-mono">{l.tabela}</TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-32">{l.registro_id || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Auditoria;

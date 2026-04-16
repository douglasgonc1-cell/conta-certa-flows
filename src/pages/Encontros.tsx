import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Plus, Play, Square } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type EncontroStatus = Database["public"]["Enums"]["encontro_status"];
type EncontroTipo = Database["public"]["Enums"]["encontro_tipo"];

const statusColors: Record<EncontroStatus, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  ABERTO: "bg-primary/10 text-primary",
  ENCERRADO: "bg-destructive/10 text-destructive",
};

const Encontros = () => {
  const [open, setOpen] = useState(false);
  const [competencia, setCompetencia] = useState("");
  const [tipo, setTipo] = useState<EncontroTipo>("FIXOS");
  const { toast } = useToast();
  const { log } = useAudit();
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasAnyRole("admin", "financeiro");

  const { data: encontros, isLoading } = useQuery({
    queryKey: ["encontros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("encontros").select("*").order("competencia", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("encontros").insert({ competencia, tipo, created_by: user?.id });
      if (error) throw error;
      await log("CRIAR", "encontros", undefined, undefined, { competencia, tipo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      toast({ title: "Encontro criado" });
      setOpen(false);
      setCompetencia("");
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: EncontroStatus }) => {
      const { error } = await supabase.from("encontros").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      await log("EDITAR", "encontros", id, undefined, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      toast({ title: "Status atualizado" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Encontros de Contas</h1><p className="text-muted-foreground">Gerenciamento por competência</p></div>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus size={16} /> Novo Encontro</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Encontro</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2"><Label>Competência (MM/AAAA)</Label><Input value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="04/2026" required /></div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as EncontroTipo)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXOS">Fixos</SelectItem>
                        <SelectItem value="VARIAVEIS">Variáveis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Competência</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead>{canManage && <TableHead>Ações</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : encontros?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum encontro</TableCell></TableRow>
              ) : (
                encontros?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.competencia}</TableCell>
                    <TableCell>{e.tipo}</TableCell>
                    <TableCell><Badge className={statusColors[e.status]} variant="secondary">{e.status}</Badge></TableCell>
                    {canManage && (
                      <TableCell className="flex gap-1">
                        {e.status === "RASCUNHO" && <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: e.id, newStatus: "ABERTO" })}><Play size={14} /> Abrir</Button>}
                        {e.status === "ABERTO" && <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: e.id, newStatus: "ENCERRADO" })}><Square size={14} /> Encerrar</Button>}
                      </TableCell>
                    )}
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

export default Encontros;

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
  const [form, setForm] = useState({
    competencia: "",
    tipo: "FIXOS" as EncontroTipo,
    numero: "1",
    dt_limite_inclusao: "",
    hr_limite_inclusao: "",
    dt_limite_exclusao: "",
    hr_limite_exclusao: "",
    dt_vencimento_devedora: "",
    dt_vencimento_credora: "",
  });
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

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const resetForm = () =>
    setForm({
      competencia: "", tipo: "FIXOS", numero: "1",
      dt_limite_inclusao: "", hr_limite_inclusao: "",
      dt_limite_exclusao: "", hr_limite_exclusao: "",
      dt_vencimento_devedora: "", dt_vencimento_credora: "",
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        competencia: form.competencia,
        tipo: form.tipo,
        numero: parseInt(form.numero, 10),
        dt_limite_inclusao: form.dt_limite_inclusao || null,
        hr_limite_inclusao: form.hr_limite_inclusao || null,
        dt_limite_exclusao: form.dt_limite_exclusao || null,
        hr_limite_exclusao: form.hr_limite_exclusao || null,
        dt_vencimento_devedora: form.dt_vencimento_devedora || null,
        dt_vencimento_credora: form.dt_vencimento_credora || null,
        created_by: user?.id,
      };
      const { error } = await supabase.from("encontros").insert(payload);
      if (error) throw error;
      await log("CRIAR", "encontros", undefined, undefined, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      toast({ title: "Encontro criado" });
      setOpen(false);
      resetForm();
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
          <div>
            <h1 className="text-2xl font-bold">Encontros de Contas</h1>
            <p className="text-muted-foreground">Gerenciamento por competência</p>
          </div>
          {canManage && (
            <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
              <DialogTrigger asChild><Button><Plus size={16} /> Novo Encontro</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Novo Encontro</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Competência (MM/AAAA)</Label>
                      <Input value={form.competencia} onChange={(e) => set("competencia", e.target.value)} placeholder="04/2026" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXOS">Fixos</SelectItem>
                          <SelectItem value="VARIAVEIS">Variáveis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Select value={form.numero} onValueChange={(v) => set("numero", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1º Encontro</SelectItem>
                          <SelectItem value="2">2º Encontro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Dt Limite Inclusão</Label><Input type="date" value={form.dt_limite_inclusao} onChange={(e) => set("dt_limite_inclusao", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Hr Limite Inclusão</Label><Input type="time" value={form.hr_limite_inclusao} onChange={(e) => set("hr_limite_inclusao", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Dt Limite Exclusão</Label><Input type="date" value={form.dt_limite_exclusao} onChange={(e) => set("dt_limite_exclusao", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Hr Limite Exclusão</Label><Input type="time" value={form.hr_limite_exclusao} onChange={(e) => set("hr_limite_exclusao", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Dt Vencimento Devedora</Label><Input type="date" value={form.dt_vencimento_devedora} onChange={(e) => set("dt_vencimento_devedora", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Dt Vencimento Credora</Label><Input type="date" value={form.dt_vencimento_credora} onChange={(e) => set("dt_vencimento_credora", e.target.value)} /></div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Encontro"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Limite Inclusão</TableHead>
                <TableHead>Limite Exclusão</TableHead>
                <TableHead>Venc. Devedora</TableHead>
                <TableHead>Venc. Credora</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : encontros?.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum encontro</TableCell></TableRow>
              ) : (
                encontros?.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.competencia}</TableCell>
                    <TableCell>{e.tipo}</TableCell>
                    <TableCell className="text-center">{e.numero}º</TableCell>
                    <TableCell className="text-xs">{e.dt_limite_inclusao ? `${e.dt_limite_inclusao} ${e.hr_limite_inclusao || ""}`.trim() : "—"}</TableCell>
                    <TableCell className="text-xs">{e.dt_limite_exclusao ? `${e.dt_limite_exclusao} ${e.hr_limite_exclusao || ""}`.trim() : "—"}</TableCell>
                    <TableCell className="text-xs">{e.dt_vencimento_devedora || "—"}</TableCell>
                    <TableCell className="text-xs">{e.dt_vencimento_credora || "—"}</TableCell>
                    <TableCell><Badge className={statusColors[e.status as EncontroStatus]} variant="secondary">{e.status}</Badge></TableCell>
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

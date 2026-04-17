import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Plus, Check, X, Paperclip } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import FileUpload from "@/components/FileUpload";
import { notifyND } from "@/lib/notify";

type NDStatus = Database["public"]["Enums"]["nd_status"];

const statusColors: Record<NDStatus, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  LANCADA: "bg-info/10 text-info",
  LIBERADA: "bg-primary/10 text-primary",
  EXPORTADA: "bg-success/10 text-success",
  CANCELADA: "bg-destructive/10 text-destructive",
};

const NotasDebito = () => {
  const [open, setOpen] = useState(false);
  const [encontroId, setEncontroId] = useState("");
  const [credoraId, setCredoraId] = useState("");
  const [devedoraId, setDevedoraId] = useState("");
  const [tipoNdId, setTipoNdId] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexoUrl, setAnexoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { log } = useAudit();
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasAnyRole("admin", "financeiro");
  const canCreate = hasAnyRole("admin", "financeiro", "usuario");

  const { data: notas, isLoading } = useQuery({
    queryKey: ["notas_debito"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_debito")
        .select("*, encontros(competencia, tipo), unimed_credora:unimeds!notas_debito_unimed_credora_id_fkey(nome, codigo, email), unimed_devedora:unimeds!notas_debito_unimed_devedora_id_fkey(nome, codigo), tipos_nd!inner(sigla, nome, email)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: encontros } = useQuery({
    queryKey: ["encontros_abertos"],
    queryFn: async () => {
      const { data } = await supabase.from("encontros").select("*").in("status", ["RASCUNHO", "ABERTO"]).order("competencia", { ascending: false });
      return data || [];
    },
  });

  const { data: unimeds } = useQuery({
    queryKey: ["unimeds_ativas"],
    queryFn: async () => {
      const { data } = await supabase.from("unimeds").select("*").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const { data: tiposNd } = useQuery({
    queryKey: ["tipos_nd_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("tipos_nd").select("*").eq("ativo", true).order("sigla");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        encontro_id: encontroId,
        unimed_credora_id: credoraId,
        unimed_devedora_id: devedoraId,
        tipo_nd_id: tipoNdId,
        valor: parseFloat(valor),
        descricao: descricao || null,
        anexo_url: anexoUrl,
        created_by: user?.id,
        status: canManage ? "LANCADA" as const : "RASCUNHO" as const,
      };
      const { data: created, error } = await supabase.from("notas_debito").insert(payload).select("id").single();
      if (error) throw error;
      await log("CRIAR", "notas_debito", created?.id, undefined, payload);

      // Notificação por e-mail (não-bloqueante)
      const tipo = tiposNd?.find((t) => t.id === tipoNdId);
      const credora = unimeds?.find((u) => u.id === credoraId);
      const enc = encontros?.find((e) => e.id === encontroId);
      await notifyND({
        acao: "CRIADA",
        tipoNdEmail: (tipo as any)?.email,
        unimedEmail: (credora as any)?.email,
        valor: parseFloat(valor),
        competencia: enc?.competencia,
        tipoNome: tipo?.nome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas_debito"] });
      toast({ title: "Nota de Débito criada" });
      setOpen(false);
      setAnexoUrl(null);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (n: any) => {
      const { error } = await supabase.from("notas_debito").update({ status: "CANCELADA" as const, deleted_at: new Date().toISOString() }).eq("id", n.id);
      if (error) throw error;
      await log("EXCLUIR", "notas_debito", n.id, n, { status: "CANCELADA" });
      await notifyND({
        acao: "EXCLUIDA",
        tipoNdEmail: (n.tipos_nd as any)?.email,
        unimedEmail: (n.unimed_credora as any)?.email,
        numero: n.numero,
        valor: Number(n.valor),
        competencia: (n.encontros as any)?.competencia,
        tipoNome: (n.tipos_nd as any)?.nome,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas_debito"] });
      toast({ title: "ND cancelada" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: NDStatus }) => {
      const { error } = await supabase.from("notas_debito").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      await log("EDITAR", "notas_debito", id, undefined, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas_debito"] });
      toast({ title: "Status atualizado" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Notas de Débito</h1><p className="text-muted-foreground">Cobranças entre Unimeds</p></div>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus size={16} /> Nova ND</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nova Nota de Débito</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Encontro</Label>
                    <Select value={encontroId} onValueChange={setEncontroId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{encontros?.map((e) => <SelectItem key={e.id} value={e.id}>{e.competencia} - {e.tipo} ({e.status})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unimed Credora</Label>
                      <Select value={credoraId} onValueChange={setCredoraId}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{unimeds?.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Unimed Devedora</Label>
                      <Select value={devedoraId} onValueChange={setDevedoraId}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{unimeds?.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo ND</Label>
                      <Select value={tipoNdId} onValueChange={setTipoNdId}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{tiposNd?.map((t) => <SelectItem key={t.id} value={t.id}>{t.sigla} - {t.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Anexo</Label><FileUpload value={anexoUrl} onChange={setAnexoUrl} folder="notas_debito" /></div>
                  {!canManage && <p className="text-xs text-warning">Sua ND ficará pendente de liberação.</p>}
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Criar ND"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Encontro</TableHead>
                <TableHead>Credora</TableHead>
                <TableHead>Devedora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Anexo</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : notas?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma ND encontrada</TableCell></TableRow>
              ) : (
                notas?.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{(n.encontros as any)?.competencia}</TableCell>
                    <TableCell className="text-xs">{(n.unimed_credora as any)?.codigo}</TableCell>
                    <TableCell className="text-xs">{(n.unimed_devedora as any)?.codigo}</TableCell>
                    <TableCell className="text-xs">{(n.tipos_nd as any)?.sigla}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Number(n.valor))}</TableCell>
                    <TableCell>
                      {n.anexo_url ? (
                        <a href={n.anexo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          <Paperclip size={14} />
                        </a>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell><Badge className={statusColors[n.status as NDStatus]} variant="secondary">{n.status}</Badge></TableCell>
                    {canManage && (
                      <TableCell className="flex gap-1">
                        {(n.status === "RASCUNHO" || n.status === "LANCADA") && (
                          <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: n.id, newStatus: n.status === "RASCUNHO" ? "LANCADA" : "LIBERADA" })}>
                            <Check size={14} /> {n.status === "RASCUNHO" ? "Lançar" : "Liberar"}
                          </Button>
                        )}
                        {n.status !== "CANCELADA" && n.status !== "EXPORTADA" && (
                          <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate(n)}>
                            <X size={14} />
                          </Button>
                        )}
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

export default NotasDebito;

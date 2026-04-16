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
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Plus } from "lucide-react";

const Parcelamentos = () => {
  const [open, setOpen] = useState(false);
  const [credoraId, setCredoraId] = useState("");
  const [devedoraId, setDevedoraId] = useState("");
  const [tipoNdId, setTipoNdId] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [numParcelas, setNumParcelas] = useState("");
  const [descricao, setDescricao] = useState("");
  const { toast } = useToast();
  const { log } = useAudit();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: parcelamentos, isLoading } = useQuery({
    queryKey: ["parcelamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelamentos")
        .select("*, unimed_credora:unimeds!parcelamentos_unimed_credora_id_fkey(nome, codigo), unimed_devedora:unimeds!parcelamentos_unimed_devedora_id_fkey(nome, codigo), tipos_nd(sigla)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
      const vt = parseFloat(valorTotal);
      const np = parseInt(numParcelas);
      const valorParcela = Math.round((vt / np) * 100) / 100;

      const { data: parc, error } = await supabase
        .from("parcelamentos")
        .insert({
          unimed_credora_id: credoraId,
          unimed_devedora_id: devedoraId,
          tipo_nd_id: tipoNdId,
          valor_total: vt,
          num_parcelas: np,
          descricao: descricao || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Create parcela items
      const itens = Array.from({ length: np }, (_, i) => {
        const now = new Date();
        const month = now.getMonth() + 1 + i;
        const year = now.getFullYear() + Math.floor((month - 1) / 12);
        const m = ((month - 1) % 12) + 1;
        return {
          parcelamento_id: parc.id,
          numero_parcela: i + 1,
          valor: i === np - 1 ? vt - valorParcela * (np - 1) : valorParcela,
          competencia: `${String(m).padStart(2, "0")}/${year}`,
        };
      });

      const { error: errItens } = await supabase.from("parcelamento_itens").insert(itens);
      if (errItens) throw errItens;

      await log("CRIAR", "parcelamentos", parc.id, undefined, { valor_total: vt, num_parcelas: np });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelamentos"] });
      toast({ title: "Parcelamento criado" });
      setOpen(false);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Parcelamentos</h1><p className="text-muted-foreground">Acordos de pagamento entre Unimeds</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus size={16} /> Novo Parcelamento</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Parcelamento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Credora</Label>
                    <Select value={credoraId} onValueChange={setCredoraId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{unimeds?.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Devedora</Label>
                    <Select value={devedoraId} onValueChange={setDevedoraId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{unimeds?.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Tipo ND</Label><Select value={tipoNdId} onValueChange={setTipoNdId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{tiposNd?.map((t) => <SelectItem key={t.id} value={t.id}>{t.sigla} - {t.nome}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor Total (R$)</Label><Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Nº Parcelas</Label><Input type="number" min="1" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} required /></div>
                </div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar Parcelamento"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credora</TableHead>
                <TableHead>Devedora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : parcelamentos?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum parcelamento</TableCell></TableRow>
              ) : (
                parcelamentos?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{(p.unimed_credora as any)?.codigo}</TableCell>
                    <TableCell className="text-xs">{(p.unimed_devedora as any)?.codigo}</TableCell>
                    <TableCell className="text-xs">{(p.tipos_nd as any)?.sigla}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Number(p.valor_total))}</TableCell>
                    <TableCell>{p.num_parcelas}x</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {p.ativo ? "Ativo" : "Encerrado"}
                      </span>
                    </TableCell>
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

export default Parcelamentos;

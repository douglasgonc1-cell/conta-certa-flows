import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Download, History } from "lucide-react";

const Exportacao = () => {
  const [unimedId, setUnimedId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { toast } = useToast();
  const { log } = useAudit();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unimeds } = useQuery({
    queryKey: ["unimeds_ativas"],
    queryFn: async () => {
      const { data } = await supabase.from("unimeds").select("*").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const { data: ndsLiberadas, isLoading } = useQuery({
    queryKey: ["nds_liberadas", unimedId],
    queryFn: async () => {
      let q = supabase
        .from("notas_debito")
        .select("*, encontros(competencia), unimed_credora:unimeds!notas_debito_unimed_credora_id_fkey(codigo, nome), unimed_devedora:unimeds!notas_debito_unimed_devedora_id_fkey(codigo, nome), tipos_nd(sigla)")
        .eq("status", "LIBERADA")
        .is("deleted_at", null);
      if (unimedId) q = q.or(`unimed_credora_id.eq.${unimedId},unimed_devedora_id.eq.${unimedId}`);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: historico } = useQuery({
    queryKey: ["exportacoes"],
    queryFn: async () => {
      const { data } = await supabase.from("exportacoes").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (ndsLiberadas && selected.length === ndsLiberadas.length) {
      setSelected([]);
    } else {
      setSelected(ndsLiberadas?.map((n) => n.id) || []);
    }
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (selected.length === 0) throw new Error("Selecione ao menos uma ND");

      const selectedNds = ndsLiberadas?.filter((n) => selected.includes(n.id)) || [];
      const valorTotal = selectedNds.reduce((acc, n) => acc + Number(n.valor), 0);
      const fileName = `ACR_${new Date().toISOString().split("T")[0].replace(/-/g, "")}.txt`;

      // Generate ACR format
      const lines: string[] = [];
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;

      // Header (100)
      lines.push(`100   ${dateStr}${dateStr} ${String(Math.round(valorTotal * 100)).padStart(13, "0")}   Normal    7    700  `);

      // Items
      selectedNds.forEach((nd) => {
        const valorStr = String(Math.round(Number(nd.valor) * 100)).padStart(11, "0");
        const codCredora = ((nd.unimed_credora as any)?.codigo || "").padStart(9, "0");
        const sigla = (nd.tipos_nd as any)?.sigla || "ND";
        lines.push(`200 ${codCredora}${sigla.padEnd(16, " ")} REAL    01${dateStr}${dateStr}                   ${valorStr}                                                                            3       1                                                                                                                        Cliente                             Liberado    Normal                                                                                                                                                                                                                ${valorStr}`);
        if (nd.descricao) {
          lines.push(`250${nd.descricao.substring(0, 1000).padEnd(1000, " ")}`);
        }
        lines.push(`300                                                               ${valorStr}`);
      });

      // Save export record
      const { data: exp, error } = await supabase
        .from("exportacoes")
        .insert({
          tipo: "ACR",
          filtros: { unimed_id: unimedId || null },
          total_itens: selected.length,
          valor_total: valorTotal,
          arquivo_nome: fileName,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Save export items
      await supabase.from("exportacao_itens").insert(
        selected.map((ndId) => ({ exportacao_id: exp.id, nota_debito_id: ndId }))
      );

      // Update ND statuses to EXPORTADA
      await supabase.from("notas_debito").update({ status: "EXPORTADA" as const }).in("id", selected);

      await log("EXPORTAR", "exportacoes", exp.id, undefined, { total_itens: selected.length, valor_total: valorTotal });

      // Download file
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nds_liberadas"] });
      queryClient.invalidateQueries({ queryKey: ["exportacoes"] });
      queryClient.invalidateQueries({ queryKey: ["notas_debito"] });
      toast({ title: "Exportação concluída" });
      setSelected([]);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div><h1 className="text-2xl font-bold">Exportação ACR</h1><p className="text-muted-foreground">Exportar NDs liberadas para arquivo</p></div>

        <div className="flex items-end gap-4">
          <div className="w-64 space-y-2">
            <Label>Filtrar por Unimed</Label>
            <Select value={unimedId} onValueChange={setUnimedId}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {unimeds?.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => exportMutation.mutate()} disabled={selected.length === 0 || exportMutation.isPending}>
            <Download size={16} /> Exportar ({selected.length})
          </Button>
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={ndsLiberadas && ndsLiberadas.length > 0 && selected.length === ndsLiberadas.length} onCheckedChange={selectAll} /></TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Credora</TableHead>
                <TableHead>Devedora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : ndsLiberadas?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ND liberada</TableCell></TableRow>
              ) : (
                ndsLiberadas?.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell><Checkbox checked={selected.includes(n.id)} onCheckedChange={() => toggleSelect(n.id)} /></TableCell>
                    <TableCell className="font-mono text-xs">{(n.encontros as any)?.competencia}</TableCell>
                    <TableCell className="text-xs">{(n.unimed_credora as any)?.codigo}</TableCell>
                    <TableCell className="text-xs">{(n.unimed_devedora as any)?.codigo}</TableCell>
                    <TableCell className="text-xs">{(n.tipos_nd as any)?.sigla}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Number(n.valor))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Export History */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3"><History size={18} /> Histórico de Exportações</h2>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Itens</TableHead><TableHead className="text-right">Valor Total</TableHead><TableHead>Arquivo</TableHead></TableRow></TableHeader>
              <TableBody>
                {historico?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma exportação</TableCell></TableRow>
                ) : (
                  historico?.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{h.tipo}</TableCell>
                      <TableCell>{h.total_itens}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(Number(h.valor_total))}</TableCell>
                      <TableCell className="text-xs">{h.arquivo_nome}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Exportacao;

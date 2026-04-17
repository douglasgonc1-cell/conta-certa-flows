import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Download, History, Filter } from "lucide-react";

const ALL = "__all__";

// ===== Helpers de formatação ACR =====
const padR = (s: string, n: number) => (s || "").substring(0, n).padEnd(n, " ");
const padL0 = (n: number | string, len: number) => String(n).padStart(len, "0");
const ddMMyyyy = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${d.getFullYear()}`;
const HHmmss = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
const valorCentavos = (v: number) => padL0(Math.round(v * 100), 13);
const valorCentavos11 = (v: number) => padL0(Math.round(v * 100), 11);

// Constrói linha 100 (header) — 62 chars
const buildL100 = (now: Date, totalCentavos: string) =>
  "100" +
  "   " +
  ddMMyyyy(now) +
  HHmmss(now) +
  ddMMyyyy(now) +
  " " +
  totalCentavos +
  "   Normal    7    700  ";

// Constrói linha 200 (item) — ~595 chars (preserva layout do anexo)
const buildL200 = (nd: any, now: Date) => {
  const codCredora = padL0((nd.unimed_credora as any)?.codigo || "0", 9);
  const sigla = padR((nd.tipos_nd as any)?.sigla || "ND", 16);
  const valor = valorCentavos11(Number(nd.valor));
  const data = ddMMyyyy(now);
  let linha = "200 " + codCredora + sigla + " REAL    01" + data + data;
  linha = padR(linha, 61) + valor;
  linha = padR(linha, 144) + "3       1";
  linha = padR(linha, 264) + "Cliente";
  linha = padR(linha, 300) + "Liberado    Normal";
  linha = padR(linha, 561) + valor;
  return padR(linha, 595);
};

// Linha 250 (descrição) — 2004 chars
const buildL250 = (descricao: string) => "250" + padR(descricao || "", 2001);

// Linha 300 (rodapé item) — 172 chars
const buildL300 = (nd: any) => {
  const valor = valorCentavos11(Number(nd.valor));
  const numero = padR(nd.numero || "NFDRS2019461710090", 20);
  let linha = "300";
  linha = padR(linha, 64) + valor;
  linha = padR(linha, 80) + numero;
  linha = padR(linha, 104) + "00 33.1.2.03";
  linha = padR(linha, 120) + "FDRS2022080701";
  return padR(linha, 172);
};

const Exportacao = () => {
  const [unimedId, setUnimedId] = useState(ALL);
  const [tipoNdId, setTipoNdId] = useState(ALL);
  const [competencia, setCompetencia] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
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

  const { data: tipos } = useQuery({
    queryKey: ["tipos_nd_ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("tipos_nd").select("*").eq("ativo", true).order("sigla");
      return data || [];
    },
  });

  const { data: ndsLiberadas, isLoading } = useQuery({
    queryKey: ["nds_liberadas", unimedId, tipoNdId, competencia, dataIni, dataFim],
    queryFn: async () => {
      let q = supabase
        .from("notas_debito")
        .select(
          "*, encontros(competencia, tipo), unimed_credora:unimeds!notas_debito_unimed_credora_id_fkey(codigo, nome), unimed_devedora:unimeds!notas_debito_unimed_devedora_id_fkey(codigo, nome), tipos_nd(sigla, nome)",
        )
        .eq("status", "LIBERADA")
        .is("deleted_at", null);

      if (unimedId !== ALL)
        q = q.or(`unimed_credora_id.eq.${unimedId},unimed_devedora_id.eq.${unimedId}`);
      if (tipoNdId !== ALL) q = q.eq("tipo_nd_id", tipoNdId);
      if (dataIni) q = q.gte("created_at", dataIni);
      if (dataFim) q = q.lte("created_at", dataFim + "T23:59:59");

      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      let list = data || [];
      if (competencia) list = list.filter((n: any) => n.encontros?.competencia === competencia);
      return list;
    },
  });

  const { data: historico } = useQuery({
    queryKey: ["exportacoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exportacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const selectAll = () => {
    if (ndsLiberadas && selected.length === ndsLiberadas.length) setSelected([]);
    else setSelected(ndsLiberadas?.map((n) => n.id) || []);
  };

  const clearFilters = () => {
    setUnimedId(ALL);
    setTipoNdId(ALL);
    setCompetencia("");
    setDataIni("");
    setDataFim("");
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (selected.length === 0) throw new Error("Selecione ao menos uma ND");
      const selectedNds = ndsLiberadas?.filter((n) => selected.includes(n.id)) || [];
      const valorTotal = selectedNds.reduce((acc, n) => acc + Number(n.valor), 0);
      const ts = new Date();
      const fileName = `acr${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(
        ts.getDate(),
      ).padStart(2, "0")}.txt`;

      // Gera arquivo no layout ACR (100 / 200 / 250 / 300)
      const lines: string[] = [];
      lines.push(buildL100(ts, valorCentavos(valorTotal)));
      selectedNds.forEach((nd) => {
        lines.push(buildL200(nd, ts));
        const descPadrao = `VALOR REFERENTE A ${(nd.tipos_nd as any)?.nome || "COBRANCA"}. COMPETENCIA: ${
          (nd.encontros as any)?.competencia || ""
        }`;
        lines.push(buildL250(nd.descricao || descPadrao));
        lines.push(buildL300(nd));
      });

      const { data: exp, error } = await supabase
        .from("exportacoes")
        .insert({
          tipo: "ACR",
          filtros: {
            unimed_id: unimedId !== ALL ? unimedId : null,
            tipo_nd_id: tipoNdId !== ALL ? tipoNdId : null,
            competencia: competencia || null,
            data_ini: dataIni || null,
            data_fim: dataFim || null,
          },
          total_itens: selected.length,
          valor_total: valorTotal,
          arquivo_nome: fileName,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("exportacao_itens")
        .insert(selected.map((ndId) => ({ exportacao_id: exp.id, nota_debito_id: ndId })));

      await supabase
        .from("notas_debito")
        .update({ status: "EXPORTADA" as const })
        .in("id", selected);

      await log("EXPORTAR", "exportacoes", exp.id, undefined, {
        total_itens: selected.length,
        valor_total: valorTotal,
      });

      const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/plain" });
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
      toast({ title: "Exportação concluída", description: "Arquivo ACR gerado com sucesso." });
      setSelected([]);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const totalSelecionado = useMemo(
    () =>
      (ndsLiberadas || [])
        .filter((n) => selected.includes(n.id))
        .reduce((s, n) => s + Number(n.valor), 0),
    [ndsLiberadas, selected],
  );

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Exportação ACR / APB</h1>
          <p className="text-muted-foreground">
            Exporta Notas de Débito LIBERADAS no formato TXT do TOTVS (layout 100/200/250/300)
          </p>
        </div>

        {/* Filtros */}
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter size={16} /> Filtros
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unimed</Label>
              <Select value={unimedId} onValueChange={setUnimedId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {unimeds?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Nota</Label>
              <Select value={tipoNdId} onValueChange={setTipoNdId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {tipos?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.sigla} - {t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Competência</Label>
              <Input placeholder="MM/AAAA" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Emissão (de)</Label>
              <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Emissão (até)</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </div>

        {/* Resumo seleção + ação */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <span><strong>{selected.length}</strong> selecionada(s) de {ndsLiberadas?.length || 0}</span>
            <span className="text-muted-foreground">Total:</span>
            <span className="font-mono font-semibold text-primary">{formatCurrency(totalSelecionado)}</span>
          </div>
          <Button onClick={() => exportMutation.mutate()} disabled={selected.length === 0 || exportMutation.isPending}>
            <Download size={16} className="mr-2" />
            {exportMutation.isPending ? "Gerando..." : `Exportar ACR (${selected.length})`}
          </Button>
        </div>

        {/* Lista de NDs elegíveis */}
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={!!ndsLiberadas?.length && selected.length === ndsLiberadas.length}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Credora</TableHead>
                <TableHead>Devedora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : ndsLiberadas?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma ND LIBERADA encontrada com os filtros aplicados</TableCell></TableRow>
              ) : (
                ndsLiberadas?.map((n) => (
                  <TableRow key={n.id} className={selected.includes(n.id) ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Checkbox checked={selected.includes(n.id)} onCheckedChange={() => toggleSelect(n.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{n.numero || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{(n.encontros as any)?.competencia}</TableCell>
                    <TableCell className="text-xs">{(n.unimed_credora as any)?.codigo} - {(n.unimed_credora as any)?.nome}</TableCell>
                    <TableCell className="text-xs">{(n.unimed_devedora as any)?.codigo} - {(n.unimed_devedora as any)?.nome}</TableCell>
                    <TableCell><Badge variant="outline">{(n.tipos_nd as any)?.sigla}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(n.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(Number(n.valor))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Histórico */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <History size={18} /> Histórico de Exportações
          </h2>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Filtros</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Arquivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma exportação</TableCell></TableRow>
                ) : (
                  historico?.map((h) => {
                    const f: any = h.filtros || {};
                    const filtroResumo = [
                      f.unimed_id && "Unimed",
                      f.tipo_nd_id && "Tipo",
                      f.competencia && `Comp:${f.competencia}`,
                      f.data_ini && `de ${f.data_ini}`,
                      f.data_fim && `até ${f.data_fim}`,
                    ].filter(Boolean).join(" • ") || "—";
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell><Badge>{h.tipo}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{filtroResumo}</TableCell>
                        <TableCell className="text-center">{h.total_itens}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(Number(h.valor_total))}</TableCell>
                        <TableCell className="text-xs font-mono">{h.arquivo_nome}</TableCell>
                      </TableRow>
                    );
                  })
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

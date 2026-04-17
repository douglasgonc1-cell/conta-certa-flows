import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, FileDown, Loader2 } from "lucide-react";

// ===== Helpers =====
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (s) {
    case "LIBERADA":
    case "EXPORTADA":
      return "default";
    case "LANCADA":
      return "secondary";
    case "CANCELADA":
      return "destructive";
    default:
      return "outline";
  }
};

const exportCSV = (filename: string, rows: Record<string, any>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          const s = String(v).replace(/"/g, '""');
          return /[;"\n]/.test(s) ? `"${s}"` : s;
        })
        .join(";"),
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ===== Shared Filter Hooks =====
type Unimed = { id: string; codigo: string; nome: string };
type TipoND = { id: string; sigla: string; nome: string };
type Encontro = { id: string; competencia: string; tipo: string };

const useFilterData = () => {
  const [unimeds, setUnimeds] = useState<Unimed[]>([]);
  const [tipos, setTipos] = useState<TipoND[]>([]);
  const [encontros, setEncontros] = useState<Encontro[]>([]);

  useEffect(() => {
    (async () => {
      const [u, t, e] = await Promise.all([
        supabase.from("unimeds").select("id,codigo,nome").eq("ativo", true).order("nome"),
        supabase.from("tipos_nd").select("id,sigla,nome").eq("ativo", true).order("sigla"),
        supabase.from("encontros").select("id,competencia,tipo").order("competencia", { ascending: false }),
      ]);
      setUnimeds(u.data || []);
      setTipos(t.data || []);
      setEncontros(e.data || []);
    })();
  }, []);

  return { unimeds, tipos, encontros };
};

// ===== Layout helpers =====
const ReportShell = ({
  title,
  description,
  filters,
  onSearch,
  onExport,
  loading,
  children,
}: {
  title: string;
  description: string;
  filters: React.ReactNode;
  onSearch: () => void;
  onExport?: () => void;
  loading: boolean;
  children: React.ReactNode;
}) => (
  <AppLayout>
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {onExport && (
          <Button variant="outline" onClick={onExport} disabled={loading}>
            <FileDown className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">{filters}</div>
        <div className="flex justify-end">
          <Button onClick={onSearch} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Consultar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">{children}</div>
    </div>
  </AppLayout>
);

const FilterField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const ALL = "__all__";

// ===== 8.1 Parcelamentos =====
export const RelParcelamentos = () => {
  const { unimeds, tipos } = useFilterData();
  const [credoraId, setCredoraId] = useState(ALL);
  const [devedoraId, setDevedoraId] = useState(ALL);
  const [tipoId, setTipoId] = useState(ALL);
  const [compIni, setCompIni] = useState("");
  const [compFim, setCompFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const search = async () => {
    setLoading(true);
    let q = supabase
      .from("parcelamentos")
      .select(
        `id, descricao, valor_total, num_parcelas, ativo, created_at,
         unimed_credora:unimeds!parcelamentos_unimed_credora_id_fkey(codigo,nome),
         unimed_devedora:unimeds!parcelamentos_unimed_devedora_id_fkey(codigo,nome),
         tipo_nd:tipos_nd(sigla,nome),
         parcelamento_itens(id, valor, competencia, materializada, nota_debito_id)`,
      )
      .order("created_at", { ascending: false });

    if (credoraId !== ALL) q = q.eq("unimed_credora_id", credoraId);
    if (devedoraId !== ALL) q = q.eq("unimed_devedora_id", devedoraId);
    if (tipoId !== ALL) q = q.eq("tipo_nd_id", tipoId);

    const { data } = await q;
    let list = data || [];

    if (compIni || compFim) {
      list = list.filter((p: any) =>
        (p.parcelamento_itens || []).some((it: any) => {
          if (compIni && it.competencia < compIni) return false;
          if (compFim && it.competencia > compFim) return false;
          return true;
        }),
      );
    }

    const enriched = list.map((p: any) => {
      const itens = p.parcelamento_itens || [];
      const pagas = itens.filter((i: any) => i.materializada).length;
      const valorPago = itens.filter((i: any) => i.materializada).reduce((s: number, i: any) => s + Number(i.valor), 0);
      const valorAberto = Number(p.valor_total) - valorPago;
      const situacao = !p.ativo ? "INATIVO" : pagas === itens.length ? "QUITADO" : pagas > 0 ? "EM ANDAMENTO" : "ATIVO";
      return { ...p, _pagas: pagas, _valorPago: valorPago, _valorAberto: valorAberto, _situacao: situacao };
    });

    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    search();
  }, []);

  const handleExport = () =>
    exportCSV(
      "rel_parcelamentos.csv",
      rows.map((r) => ({
        Credora: `${r.unimed_credora?.codigo} - ${r.unimed_credora?.nome}`,
        Devedora: `${r.unimed_devedora?.codigo} - ${r.unimed_devedora?.nome}`,
        Tipo: r.tipo_nd?.sigla,
        Descricao: r.descricao || "",
        Parcelas: r.num_parcelas,
        Pagas: r._pagas,
        ValorTotal: r.valor_total,
        ValorPago: r._valorPago,
        ValorAberto: r._valorAberto,
        Situacao: r._situacao,
      })),
    );

  return (
    <ReportShell
      title="Relatório de Parcelamentos"
      description="Acordos de pagamento parcelados entre Unimeds"
      loading={loading}
      onSearch={search}
      onExport={handleExport}
      filters={
        <>
          <FilterField label="Unimed Credora">
            <Select value={credoraId} onValueChange={setCredoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Unimed Devedora">
            <Select value={devedoraId} onValueChange={setDevedoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Tipo ND">
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.sigla} - {t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <div className="grid grid-cols-2 gap-2">
            <FilterField label="Competência Início">
              <Input placeholder="MM/AAAA" value={compIni} onChange={(e) => setCompIni(e.target.value)} />
            </FilterField>
            <FilterField label="Competência Fim">
              <Input placeholder="MM/AAAA" value={compFim} onChange={(e) => setCompFim(e.target.value)} />
            </FilterField>
          </div>
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Credora</TableHead>
            <TableHead>Devedora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-center">Parcelas</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">Pago</TableHead>
            <TableHead className="text-right">Em Aberto</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
          ) : rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{r.unimed_credora?.codigo} - {r.unimed_credora?.nome}</TableCell>
              <TableCell className="text-xs">{r.unimed_devedora?.codigo} - {r.unimed_devedora?.nome}</TableCell>
              <TableCell><Badge variant="outline">{r.tipo_nd?.sigla}</Badge></TableCell>
              <TableCell className="text-center">{r._pagas}/{r.num_parcelas}</TableCell>
              <TableCell className="text-right font-mono">{fmtBRL(Number(r.valor_total))}</TableCell>
              <TableCell className="text-right font-mono text-primary">{fmtBRL(r._valorPago)}</TableCell>
              <TableCell className="text-right font-mono">{fmtBRL(r._valorAberto)}</TableCell>
              <TableCell><Badge variant={r._situacao === "QUITADO" ? "default" : r._situacao === "INATIVO" ? "destructive" : "secondary"}>{r._situacao}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportShell>
  );
};

// ===== 8.2 Notas de Débito =====
export const RelNotasDebito = () => {
  const { unimeds, tipos, encontros } = useFilterData();
  const [credoraId, setCredoraId] = useState(ALL);
  const [devedoraId, setDevedoraId] = useState(ALL);
  const [tipoId, setTipoId] = useState(ALL);
  const [encontroId, setEncontroId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const search = async () => {
    setLoading(true);
    let q = supabase
      .from("notas_debito")
      .select(
        `id, numero, valor, status, origem, descricao, created_at,
         unimed_credora:unimeds!notas_debito_unimed_credora_id_fkey(codigo,nome),
         unimed_devedora:unimeds!notas_debito_unimed_devedora_id_fkey(codigo,nome),
         tipo_nd:tipos_nd(sigla,nome),
         encontro:encontros(competencia,tipo)`,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (credoraId !== ALL) q = q.eq("unimed_credora_id", credoraId);
    if (devedoraId !== ALL) q = q.eq("unimed_devedora_id", devedoraId);
    if (tipoId !== ALL) q = q.eq("tipo_nd_id", tipoId);
    if (encontroId !== ALL) q = q.eq("encontro_id", encontroId);
    if (status !== ALL) q = q.eq("status", status as any);

    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    search();
  }, []);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.valor), 0), [rows]);

  const handleExport = () =>
    exportCSV(
      "rel_notas_debito.csv",
      rows.map((r) => ({
        Numero: r.numero || "",
        Credora: `${r.unimed_credora?.codigo} - ${r.unimed_credora?.nome}`,
        Devedora: `${r.unimed_devedora?.codigo} - ${r.unimed_devedora?.nome}`,
        Tipo: r.tipo_nd?.sigla,
        Encontro: `${r.encontro?.competencia} (${r.encontro?.tipo})`,
        Valor: r.valor,
        Status: r.status,
        Origem: r.origem,
      })),
    );

  return (
    <ReportShell
      title="Relatório de Notas de Débito"
      description="Controle de notas de débito emitidas entre Unimeds"
      loading={loading}
      onSearch={search}
      onExport={handleExport}
      filters={
        <>
          <FilterField label="Unimed Credora">
            <Select value={credoraId} onValueChange={setCredoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Unimed Devedora">
            <Select value={devedoraId} onValueChange={setDevedoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Tipo ND">
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.sigla}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Encontro">
            <Select value={encontroId} onValueChange={setEncontroId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {encontros.map((e) => <SelectItem key={e.id} value={e.id}>{e.competencia} - {e.tipo}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {["RASCUNHO", "LANCADA", "LIBERADA", "EXPORTADA", "CANCELADA"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Credora</TableHead>
            <TableHead>Devedora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Encontro</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
          ) : (
            <>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.numero || "—"}</TableCell>
                  <TableCell className="text-xs">{r.unimed_credora?.codigo}</TableCell>
                  <TableCell className="text-xs">{r.unimed_devedora?.codigo}</TableCell>
                  <TableCell><Badge variant="outline">{r.tipo_nd?.sigla}</Badge></TableCell>
                  <TableCell className="text-xs">{r.encontro?.competencia} <span className="text-muted-foreground">({r.encontro?.tipo})</span></TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(Number(r.valor))}</TableCell>
                  <TableCell className="text-xs">{r.origem}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={5} className="text-right">Total ({rows.length} notas)</TableCell>
                <TableCell className="text-right font-mono">{fmtBRL(total)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </ReportShell>
  );
};

// ===== 8.3 Demonstrativo Sintético =====
export const RelSintetico = () => {
  const { unimeds, encontros } = useFilterData();
  const [unimedAId, setUnimedAId] = useState(ALL);
  const [unimedBId, setUnimedBId] = useState(ALL);
  const [encontroId, setEncontroId] = useState(ALL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ debitos: number; creditos: number; nDeb: number; nCre: number } | null>(null);

  const search = async () => {
    if (unimedAId === ALL || unimedBId === ALL) {
      setResult(null);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("notas_debito")
      .select("valor, unimed_credora_id, unimed_devedora_id")
      .is("deleted_at", null)
      .neq("status", "CANCELADA");
    if (encontroId !== ALL) q = q.eq("encontro_id", encontroId);

    const { data } = await q;
    const list = (data || []).filter(
      (n: any) =>
        (n.unimed_credora_id === unimedAId && n.unimed_devedora_id === unimedBId) ||
        (n.unimed_credora_id === unimedBId && n.unimed_devedora_id === unimedAId),
    );
    // A perspectiva: A é "minha" Unimed
    const creditos = list.filter((n: any) => n.unimed_credora_id === unimedAId);
    const debitos = list.filter((n: any) => n.unimed_devedora_id === unimedAId);
    setResult({
      creditos: creditos.reduce((s, n: any) => s + Number(n.valor), 0),
      debitos: debitos.reduce((s, n: any) => s + Number(n.valor), 0),
      nCre: creditos.length,
      nDeb: debitos.length,
    });
    setLoading(false);
  };

  const saldo = result ? result.creditos - result.debitos : 0;
  const unimedA = unimeds.find((u) => u.id === unimedAId);
  const unimedB = unimeds.find((u) => u.id === unimedBId);

  return (
    <ReportShell
      title="Demonstrativo Sintético"
      description="Resumo financeiro consolidado entre duas Unimeds"
      loading={loading}
      onSearch={search}
      filters={
        <>
          <FilterField label="Unimed A (perspectiva)">
            <Select value={unimedAId} onValueChange={setUnimedAId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>—</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Unimed B (contraparte)">
            <Select value={unimedBId} onValueChange={setUnimedBId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>—</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Encontro (opcional)">
            <Select value={encontroId} onValueChange={setEncontroId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {encontros.map((e) => <SelectItem key={e.id} value={e.id}>{e.competencia} - {e.tipo}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
        </>
      }
    >
      <div className="p-6">
        {!result ? (
          <div className="text-center text-muted-foreground py-8">Selecione duas Unimeds e clique em Consultar.</div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Perspectiva: <strong className="text-foreground">{unimedA?.nome}</strong> ↔ {unimedB?.nome}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-5">
                <div className="text-xs text-muted-foreground uppercase">Total a Receber (Créditos)</div>
                <div className="mt-2 text-2xl font-bold text-primary font-mono">{fmtBRL(result.creditos)}</div>
                <div className="text-xs text-muted-foreground mt-1">{result.nCre} notas</div>
              </div>
              <div className="rounded-lg border bg-card p-5">
                <div className="text-xs text-muted-foreground uppercase">Total a Pagar (Débitos)</div>
                <div className="mt-2 text-2xl font-bold text-destructive font-mono">{fmtBRL(result.debitos)}</div>
                <div className="text-xs text-muted-foreground mt-1">{result.nDeb} notas</div>
              </div>
              <div className="rounded-lg border bg-card p-5">
                <div className="text-xs text-muted-foreground uppercase">Saldo Final</div>
                <div className={`mt-2 text-2xl font-bold font-mono ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                  {fmtBRL(saldo)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{saldo >= 0 ? "A receber" : "A pagar"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReportShell>
  );
};

// ===== 8.4 Demonstrativo por Tipo de Nota =====
export const RelTipoNota = () => {
  const { unimeds, encontros } = useFilterData();
  const [encontroId, setEncontroId] = useState(ALL);
  const [credoraId, setCredoraId] = useState(ALL);
  const [devedoraId, setDevedoraId] = useState(ALL);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const search = async () => {
    setLoading(true);
    let q = supabase
      .from("notas_debito")
      .select("valor, tipo_nd:tipos_nd(sigla,nome)")
      .is("deleted_at", null)
      .neq("status", "CANCELADA");
    if (encontroId !== ALL) q = q.eq("encontro_id", encontroId);
    if (credoraId !== ALL) q = q.eq("unimed_credora_id", credoraId);
    if (devedoraId !== ALL) q = q.eq("unimed_devedora_id", devedoraId);

    const { data } = await q;
    const grouped: Record<string, { sigla: string; nome: string; total: number; qtd: number }> = {};
    (data || []).forEach((n: any) => {
      const sigla = n.tipo_nd?.sigla || "—";
      if (!grouped[sigla]) grouped[sigla] = { sigla, nome: n.tipo_nd?.nome || "", total: 0, qtd: 0 };
      grouped[sigla].total += Number(n.valor);
      grouped[sigla].qtd += 1;
    });
    setRows(Object.values(grouped).sort((a, b) => b.total - a.total));
    setLoading(false);
  };

  useEffect(() => {
    search();
  }, []);

  const total = rows.reduce((s, r) => s + r.total, 0);
  const handleExport = () =>
    exportCSV("rel_tipo_nota.csv", rows.map((r) => ({ Sigla: r.sigla, Nome: r.nome, Quantidade: r.qtd, Total: r.total })));

  return (
    <ReportShell
      title="Demonstrativo por Tipo de Nota"
      description="Detalhamento de valores agrupados por tipo de nota"
      loading={loading}
      onSearch={search}
      onExport={handleExport}
      filters={
        <>
          <FilterField label="Encontro">
            <Select value={encontroId} onValueChange={setEncontroId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {encontros.map((e) => <SelectItem key={e.id} value={e.id}>{e.competencia} - {e.tipo}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Unimed Credora">
            <Select value={credoraId} onValueChange={setCredoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Unimed Devedora">
            <Select value={devedoraId} onValueChange={setDevedoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sigla</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="text-center">Qtd Notas</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">% do Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum registro</TableCell></TableRow>
          ) : (
            <>
              {rows.map((r) => (
                <TableRow key={r.sigla}>
                  <TableCell><Badge variant="outline">{r.sigla}</Badge></TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell className="text-center">{r.qtd}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(r.total)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {total > 0 ? ((r.total / total) * 100).toFixed(1) : "0.0"}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={3} className="text-right">Total Geral</TableCell>
                <TableCell className="text-right font-mono">{fmtBRL(total)}</TableCell>
                <TableCell className="text-right font-mono">100.0%</TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </ReportShell>
  );
};

// ===== 8.5 Cobrança de Eventos =====
export const RelCobrancaEventos = () => {
  const { unimeds, tipos, encontros } = useFilterData();
  const [credoraId, setCredoraId] = useState(ALL);
  const [devedoraId, setDevedoraId] = useState(ALL);
  const [tipoId, setTipoId] = useState(ALL);
  const [encontroId, setEncontroId] = useState(ALL);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const search = async () => {
    setLoading(true);
    let q = supabase
      .from("notas_debito")
      .select(
        `id, numero, valor, status, descricao, created_at,
         unimed_credora:unimeds!notas_debito_unimed_credora_id_fkey(codigo,nome),
         unimed_devedora:unimeds!notas_debito_unimed_devedora_id_fkey(codigo,nome),
         tipo_nd:tipos_nd(sigla),
         encontro:encontros(competencia)`,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (credoraId !== ALL) q = q.eq("unimed_credora_id", credoraId);
    if (devedoraId !== ALL) q = q.eq("unimed_devedora_id", devedoraId);
    if (tipoId !== ALL) q = q.eq("tipo_nd_id", tipoId);
    if (encontroId !== ALL) q = q.eq("encontro_id", encontroId);

    const { data } = await q;
    let list = data || [];
    if (busca.trim()) {
      const term = busca.toLowerCase();
      list = list.filter((r: any) =>
        (r.descricao || "").toLowerCase().includes(term) || (r.numero || "").toLowerCase().includes(term),
      );
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    search();
  }, []);

  const total = rows.reduce((s, r) => s + Number(r.valor), 0);
  const handleExport = () =>
    exportCSV(
      "rel_cobranca_eventos.csv",
      rows.map((r) => ({
        Numero: r.numero || "",
        Data: new Date(r.created_at).toLocaleDateString("pt-BR"),
        Descricao: r.descricao || "",
        Tipo: r.tipo_nd?.sigla,
        Credora: r.unimed_credora?.codigo,
        Devedora: r.unimed_devedora?.codigo,
        Competencia: r.encontro?.competencia,
        Valor: r.valor,
        Status: r.status,
      })),
    );

  return (
    <ReportShell
      title="Cobrança de Eventos"
      description="Eventos individuais que geraram cobrança"
      loading={loading}
      onSearch={search}
      onExport={handleExport}
      filters={
        <>
          <FilterField label="Unimed Credora">
            <Select value={credoraId} onValueChange={setCredoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Unimed Devedora">
            <Select value={devedoraId} onValueChange={setDevedoraId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {unimeds.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} - {u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Tipo">
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.sigla}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Encontro">
            <Select value={encontroId} onValueChange={setEncontroId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {encontros.map((e) => <SelectItem key={e.id} value={e.id}>{e.competencia} - {e.tipo}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Buscar (nº ou descrição)">
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar..." />
          </FilterField>
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cred → Dev</TableHead>
            <TableHead>Comp.</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum evento</TableCell></TableRow>
          ) : (
            <>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.numero || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{r.descricao || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.tipo_nd?.sigla}</Badge></TableCell>
                  <TableCell className="text-xs">{r.unimed_credora?.codigo} → {r.unimed_devedora?.codigo}</TableCell>
                  <TableCell className="text-xs">{r.encontro?.competencia}</TableCell>
                  <TableCell className="text-right font-mono">{fmtBRL(Number(r.valor))}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={6} className="text-right">Total ({rows.length} eventos)</TableCell>
                <TableCell className="text-right font-mono">{fmtBRL(total)}</TableCell>
                <TableCell />
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </ReportShell>
  );
};

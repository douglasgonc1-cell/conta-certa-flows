import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Plus, Pencil } from "lucide-react";
import FileUpload from "@/components/FileUpload";

const TiposND = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [sigla, setSigla] = useState("");
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [mapeamento, setMapeamento] = useState("");
  const [email, setEmail] = useState("");
  const [anexoUrl, setAnexoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { log } = useAudit();
  const queryClient = useQueryClient();

  const { data: tipos, isLoading } = useQuery({
    queryKey: ["tipos_nd"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_nd").select("*").order("sigla");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = { sigla, nome, ativo, mapeamento_contabil: mapeamento || null, email: email || null, anexo_url: anexoUrl };
      if (editing) {
        const { error } = await supabase.from("tipos_nd").update(payload).eq("id", editing.id);
        if (error) throw error;
        await log("EDITAR", "tipos_nd", editing.id, editing, payload);
      } else {
        const { error } = await supabase.from("tipos_nd").insert(payload);
        if (error) throw error;
        await log("CRIAR", "tipos_nd", undefined, undefined, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_nd"] });
      toast({ title: editing ? "Tipo atualizado" : "Tipo criado" });
      resetForm();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const resetForm = () => {
    setEditing(null); setSigla(""); setNome(""); setAtivo(true); setMapeamento(""); setEmail(""); setAnexoUrl(null); setOpen(false);
  };

  const openEdit = (t: any) => {
    setEditing(t); setSigla(t.sigla); setNome(t.nome); setAtivo(t.ativo);
    setMapeamento(t.mapeamento_contabil || ""); setEmail(t.email || ""); setAnexoUrl(t.anexo_url || null);
    setOpen(true);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tipos de Nota de Débito</h1>
            <p className="text-muted-foreground">Cadastro de tipos de ND</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button><Plus size={16} /> Novo Tipo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Tipo" : "Novo Tipo"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Sigla</Label><Input value={sigla} onChange={(e) => setSigla(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Mapeamento Contábil</Label><Input value={mapeamento} onChange={(e) => setMapeamento(e.target.value)} /></div>
                <div className="space-y-2"><Label>E-mail (notificações)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex: notificacoes@unimed.coop.br" /></div>
                <div className="space-y-2"><Label>Anexo (modelo / referência)</Label><FileUpload value={anexoUrl} onChange={setAnexoUrl} folder="tipos_nd" /></div>
                <div className="flex items-center gap-2"><Switch checked={ativo} onCheckedChange={setAtivo} /><Label>Ativo</Label></div>
                <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sigla</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Mapeamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : tipos?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum tipo cadastrado</TableCell></TableRow>
              ) : (
                tipos?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono">{t.sigla}</TableCell>
                    <TableCell>{t.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{t.mapeamento_contabil || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {t.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil size={14} /></Button></TableCell>
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

export default TiposND;

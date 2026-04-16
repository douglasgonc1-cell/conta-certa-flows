import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Plus, Pencil } from "lucide-react";

const Parametros = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [chave, setChave] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const { toast } = useToast();
  const { log } = useAudit();
  const queryClient = useQueryClient();

  const { data: params, isLoading } = useQuery({
    queryKey: ["parametros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parametros").select("*").order("chave");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { chave, valor, descricao: descricao || null };
      if (editing) {
        const { error } = await supabase.from("parametros").update(payload).eq("id", editing.id);
        if (error) throw error;
        await log("EDITAR", "parametros", editing.id, editing, payload);
      } else {
        const { error } = await supabase.from("parametros").insert(payload);
        if (error) throw error;
        await log("CRIAR", "parametros", undefined, undefined, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parametros"] });
      toast({ title: editing ? "Parâmetro atualizado" : "Parâmetro criado" });
      resetForm();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const resetForm = () => {
    setEditing(null); setChave(""); setValor(""); setDescricao(""); setOpen(false);
  };

  const openEdit = (p: any) => {
    setEditing(p); setChave(p.chave); setValor(p.valor); setDescricao(p.descricao || ""); setOpen(true);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Parâmetros</h1><p className="text-muted-foreground">Configurações do sistema</p></div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild><Button><Plus size={16} /> Novo Parâmetro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Parâmetro" : "Novo Parâmetro"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Chave</Label><Input value={chave} onChange={(e) => setChave(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Valor</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Chave</TableHead><TableHead>Valor</TableHead><TableHead>Descrição</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : params?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum parâmetro</TableCell></TableRow>
              ) : (
                params?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.chave}</TableCell>
                    <TableCell>{p.valor}</TableCell>
                    <TableCell className="text-muted-foreground">{p.descricao || "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil size={14} /></Button></TableCell>
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

export default Parametros;

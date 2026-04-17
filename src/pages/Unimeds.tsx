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

const Unimeds = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ativo, setAtivo] = useState(true);
  const { toast } = useToast();
  const { log } = useAudit();
  const queryClient = useQueryClient();

  const { data: unimeds, isLoading } = useQuery({
    queryKey: ["unimeds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("unimeds").select("*").order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { codigo, nome, email: email || null, ativo };
      if (editing) {
        const { error } = await supabase.from("unimeds").update(payload).eq("id", editing.id);
        if (error) throw error;
        await log("EDITAR", "unimeds", editing.id, editing, payload);
      } else {
        const { error } = await supabase.from("unimeds").insert(payload);
        if (error) throw error;
        await log("CRIAR", "unimeds", undefined, undefined, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unimeds"] });
      toast({ title: editing ? "Unimed atualizada" : "Unimed criada" });
      resetForm();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const resetForm = () => {
    setEditing(null);
    setCodigo("");
    setNome("");
    setEmail("");
    setAtivo(true);
    setOpen(false);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setCodigo(u.codigo);
    setNome(u.nome);
    setEmail(u.email || "");
    setAtivo(u.ativo);
    setOpen(true);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Unimeds</h1>
            <p className="text-muted-foreground">Cadastro de Unimeds</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button><Plus size={16} /> Nova Unimed</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Unimed" : "Nova Unimed"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail (notificações)</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="financeiro@unimed.coop.br" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={ativo} onCheckedChange={setAtivo} />
                  <Label>Ativo</Label>
                </div>
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : unimeds?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma Unimed cadastrada</TableCell></TableRow>
              ) : (
                unimeds?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono">{u.codigo}</TableCell>
                    <TableCell>{u.nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(u as any).email || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil size={14} /></Button>
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

export default Unimeds;

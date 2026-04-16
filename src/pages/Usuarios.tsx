import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAudit } from "@/hooks/useAudit";
import { Plus, Pencil } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  unimed_consulta: "Unimed (Consulta)",
  usuario: "Usuário",
};

const Usuarios = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("usuario");
  const [ativo, setAtivo] = useState(true);
  const { toast } = useToast();
  const { log } = useAudit();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users_admin"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      // Fetch roles separately
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        roles: (roles || []).filter((r) => r.user_id === p.user_id),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create user via edge function would be ideal, but for now use admin API
      // Note: In production, this should use a server-side function
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Assign role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role,
      });
      if (roleError) throw roleError;

      // Update profile active status
      if (!ativo) {
        await supabase.from("profiles").update({ ativo: false }).eq("user_id", authData.user.id);
      }

      await log("CRIAR", "usuarios", authData.user.id, undefined, { email, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users_admin"] });
      toast({ title: "Usuário criado" });
      setOpen(false);
      setEmail("");
      setFullName("");
      setPassword("");
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Erro", description: err.message }),
  });

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Usuários</h1><p className="text-muted-foreground">Gerenciamento de acesso</p></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus size={16} /> Novo Usuário</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Nome Completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleLabels) as AppRole[]).map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2"><Switch checked={ativo} onCheckedChange={setAtivo} /><Label>Ativo</Label></div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar Usuário"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : users?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.full_name || "—"}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell>
                      {u.roles?.map((r: any) => (
                        <Badge key={r.role} variant="secondary" className="mr-1">{roleLabels[r.role as AppRole] || r.role}</Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {u.ativo ? "Ativo" : "Inativo"}
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

export default Usuarios;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message || "Verifique suas credenciais.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Form */}
      <div className="flex w-full flex-col items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg">
              AC
            </div>
            <h1 className="text-2xl font-bold text-foreground">Achilles</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sistema de Gestão de Encontro de Contas
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
              <LogIn size={18} />
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Acesso restrito a colaboradores autorizados.
            </p>
          </form>
        </div>
      </div>

      {/* Right - Hero */}
      <div className="hidden flex-col items-start justify-center gap-6 p-16 lg:flex lg:w-1/2 gradient-hero">
        <div className="max-w-lg animate-slide-in-right">
          <h2 className="text-4xl font-bold leading-tight text-hero-foreground">
            Gestão inteligente
            <br />
            de encontro de contas.
          </h2>
          <p className="mt-4 text-lg text-hero-muted">
            Otimize o gerenciamento de cobranças entre Unimeds com processos
            automatizados e integrados.
          </p>
        </div>
        {/* Decorative dots */}
        <div className="absolute bottom-10 right-10 grid grid-cols-5 gap-2 opacity-20">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-hero-foreground" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;

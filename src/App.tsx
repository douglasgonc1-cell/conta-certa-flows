import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Unimeds from "./pages/Unimeds";
import TiposND from "./pages/TiposND";
import Parametros from "./pages/Parametros";
import Encontros from "./pages/Encontros";
import NotasDebito from "./pages/NotasDebito";
import Parcelamentos from "./pages/Parcelamentos";
import Exportacao from "./pages/Exportacao";
import Auditoria from "./pages/Auditoria";
import Usuarios from "./pages/Usuarios";
import { RelParcelamentos, RelNotasDebito, RelSintetico, RelTipoNota, RelCobrancaEventos } from "./pages/Relatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/unimeds" element={<ProtectedRoute requiredRoles={["admin", "financeiro"]}><Unimeds /></ProtectedRoute>} />
            <Route path="/tipos-nd" element={<ProtectedRoute requiredRoles={["admin", "financeiro"]}><TiposND /></ProtectedRoute>} />
            <Route path="/parametros" element={<ProtectedRoute requiredRoles={["admin"]}><Parametros /></ProtectedRoute>} />
            <Route path="/encontros" element={<ProtectedRoute><Encontros /></ProtectedRoute>} />
            <Route path="/notas-debito" element={<ProtectedRoute><NotasDebito /></ProtectedRoute>} />
            <Route path="/parcelamentos" element={<ProtectedRoute requiredRoles={["admin", "financeiro"]}><Parcelamentos /></ProtectedRoute>} />
            <Route path="/exportacao" element={<ProtectedRoute requiredRoles={["admin", "financeiro"]}><Exportacao /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute requiredRoles={["admin", "financeiro"]}><Auditoria /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute requiredRoles={["admin"]}><Usuarios /></ProtectedRoute>} />
            <Route path="/relatorios/parcelamentos" element={<ProtectedRoute requiredRoles={["admin", "financeiro"]}><RelParcelamentos /></ProtectedRoute>} />
            <Route path="/relatorios/notas-debito" element={<ProtectedRoute requiredRoles={["admin", "financeiro", "unimed_consulta"]}><RelNotasDebito /></ProtectedRoute>} />
            <Route path="/relatorios/sintetico" element={<ProtectedRoute requiredRoles={["admin", "financeiro", "unimed_consulta"]}><RelSintetico /></ProtectedRoute>} />
            <Route path="/relatorios/tipo-nota" element={<ProtectedRoute requiredRoles={["admin", "financeiro", "unimed_consulta"]}><RelTipoNota /></ProtectedRoute>} />
            <Route path="/relatorios/cobranca-eventos" element={<ProtectedRoute requiredRoles={["admin", "financeiro"]}><RelCobrancaEventos /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

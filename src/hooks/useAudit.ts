import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAudit = () => {
  const { user } = useAuth();

  const log = async (acao: string, tabela: string, registro_id?: string, dados_anteriores?: any, dados_novos?: any) => {
    if (!user) return;
    await supabase.from("audit_log").insert({
      user_id: user.id,
      acao,
      tabela,
      registro_id,
      dados_anteriores,
      dados_novos,
    });
  };

  return { log };
};

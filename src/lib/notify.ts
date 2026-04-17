import { supabase } from "@/integrations/supabase/client";

/**
 * Envia notificação por e-mail relacionada a uma ND.
 * Usa email do tipo_nd; se nulo, cai para email da unimed credora.
 */
export const notifyND = async (params: {
  acao: "CRIADA" | "EXCLUIDA";
  tipoNdEmail?: string | null;
  unimedEmail?: string | null;
  numero?: string | null;
  valor: number;
  competencia?: string;
  tipoNome?: string;
}) => {
  const to = params.tipoNdEmail || params.unimedEmail;
  if (!to) return;
  const valorBR = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(params.valor);
  const subject = `[GesContas] Nota de Débito ${params.acao}`;
  const html = `
    <h2>Nota de Débito ${params.acao}</h2>
    <ul>
      <li><strong>Número:</strong> ${params.numero || "—"}</li>
      <li><strong>Tipo:</strong> ${params.tipoNome || "—"}</li>
      <li><strong>Competência:</strong> ${params.competencia || "—"}</li>
      <li><strong>Valor:</strong> ${valorBR}</li>
    </ul>
  `;
  try {
    await supabase.functions.invoke("notify-nd", { body: { to, subject, html } });
  } catch (err) {
    console.warn("notifyND falhou (não-bloqueante):", err);
  }
};

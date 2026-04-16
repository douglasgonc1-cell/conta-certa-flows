import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não encontradas.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS = [
  { email: "admin@achilles.com",      password: "Achilles@2025", fullName: "Administrador",    role: "admin" },
  { email: "financeiro@achilles.com", password: "Achilles@2025", fullName: "Usuário Financeiro", role: "financeiro" },
  { email: "consulta@achilles.com",   password: "Achilles@2025", fullName: "Unimed Consulta",   role: "unimed_consulta" },
  { email: "usuario@achilles.com",    password: "Achilles@2025", fullName: "Usuário Padrão",    role: "usuario" },
];

async function seedUsers() {
  console.log("🌱 Iniciando seed de usuários...\n");

  const created = [];

  for (const u of USERS) {
    process.stdout.write(`→ Criando ${u.email} (${u.role})... `);

    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
      options: { data: { full_name: u.fullName } },
    });

    if (error) {
      console.log(`❌ Erro: ${error.message}`);
      continue;
    }

    const userId = data.user?.id;
    if (!userId) {
      console.log("❌ Usuário criado mas sem ID retornado.");
      console.log("   ⚠️  Verifique se 'Enable email confirmations' está DESABILITADO em Authentication → Settings.");
      continue;
    }

    console.log(`✅ ID: ${userId}`);
    created.push({ ...u, userId });
  }

  if (created.length === 0) {
    console.log("\n❌ Nenhum usuário criado com sucesso.");
    process.exit(1);
  }

  console.log("\n" + "─".repeat(70));
  console.log("📋 CREDENCIAIS DE ACESSO:");
  console.log("─".repeat(70));
  for (const u of created) {
    console.log(`  ${u.role.padEnd(16)} | ${u.email.padEnd(30)} | ${u.password}`);
  }

  console.log("\n" + "─".repeat(70));
  console.log("📌 EXECUTE ESTE SQL NO SUPABASE (SQL Editor) PARA ATRIBUIR AS ROLES:");
  console.log("─".repeat(70));

  const roleValues = created
    .map((u) => `('${u.userId}', '${u.role}')`)
    .join(",\n  ");

  const sql = `
INSERT INTO public.user_roles (user_id, role) VALUES
  ${roleValues}
ON CONFLICT (user_id, role) DO NOTHING;
`.trim();

  console.log("\n" + sql + "\n");
  console.log("─".repeat(70));
  console.log(`\n✅ ${created.length} usuário(s) criado(s). Cole o SQL acima no Supabase SQL Editor e execute.`);
}

seedUsers().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});

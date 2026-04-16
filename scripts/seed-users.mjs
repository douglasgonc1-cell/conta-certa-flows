import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Variáveis necessárias não encontradas.");
  console.error("   - VITE_SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌ ausente");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY:", SERVICE_ROLE_KEY ? "✅" : "❌ ausente");
  console.error("\n   Onde encontrar a service role key:");
  console.error("   Supabase → Settings → API → service_role (segunda chave)");
  process.exit(1);
}

// Admin client bypasses RLS and email confirmation
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "admin@achilles.com",      password: "Achilles@2025", fullName: "Administrador",     role: "admin" },
  { email: "financeiro@achilles.com", password: "Achilles@2025", fullName: "Usuário Financeiro", role: "financeiro" },
  { email: "consulta@achilles.com",   password: "Achilles@2025", fullName: "Unimed Consulta",    role: "unimed_consulta" },
  { email: "usuario@achilles.com",    password: "Achilles@2025", fullName: "Usuário Padrão",     role: "usuario" },
];

async function seedUsers() {
  console.log("🌱 Iniciando seed de usuários (admin API)...\n");

  const created = [];

  for (const u of USERS) {
    process.stdout.write(`→ Criando ${u.email} (${u.role})... `);

    // Delete existing user if already exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.users?.find((x) => x.email === u.email);
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    // Create user already confirmed
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    });

    if (error) {
      console.log(`❌ ${error.message}`);
      continue;
    }

    const userId = data.user?.id;

    // Assign role (bypasses RLS with service role key)
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role" });

    if (roleError) {
      console.log(`⚠️  Usuário criado mas erro na role: ${roleError.message}`);
    } else {
      console.log(`✅`);
      created.push({ ...u, userId });
    }
  }

  console.log("\n" + "─".repeat(65));
  console.log("📋 CREDENCIAIS DE ACESSO:");
  console.log("─".repeat(65));
  for (const u of created) {
    console.log(`  ${u.role.padEnd(16)} | ${u.email.padEnd(30)} | ${u.password}`);
  }
  console.log("─".repeat(65));
  console.log(`\n✅ ${created.length} usuário(s) criado(s) e confirmado(s).`);
}

seedUsers().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});

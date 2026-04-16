import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não encontradas.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS = [
  {
    email: "admin@achilles.com",
    password: "Achilles@2025",
    fullName: "Administrador",
    role: "admin",
  },
  {
    email: "financeiro@achilles.com",
    password: "Achilles@2025",
    fullName: "Usuário Financeiro",
    role: "financeiro",
  },
  {
    email: "consulta@achilles.com",
    password: "Achilles@2025",
    fullName: "Unimed Consulta",
    role: "unimed_consulta",
  },
  {
    email: "usuario@achilles.com",
    password: "Achilles@2025",
    fullName: "Usuário Padrão",
    role: "usuario",
  },
];

async function seedUsers() {
  console.log("🌱 Iniciando seed de usuários...\n");

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
      console.log("❌ Usuário criado mas sem ID retornado (verifique se confirmação de e-mail está desabilitada).");
      continue;
    }

    // Atribui role na tabela user_roles
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: u.role });

    if (roleError) {
      console.log(`⚠️  Usuário criado mas erro ao atribuir role: ${roleError.message}`);
    } else {
      console.log("✅");
    }
  }

  console.log("\n📋 Credenciais criadas:");
  console.log("─".repeat(60));
  for (const u of USERS) {
    console.log(`  Role: ${u.role.padEnd(16)} | Email: ${u.email.padEnd(28)} | Senha: ${u.password}`);
  }
  console.log("─".repeat(60));
  console.log("\n✅ Seed concluído!");
}

seedUsers().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});

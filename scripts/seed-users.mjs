import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const USING_ADMIN = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ VITE_SUPABASE_URL não encontrada.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "admin@achilles.com",      password: "Achilles@2025", fullName: "Administrador",     role: "admin" },
  { email: "financeiro@achilles.com", password: "Achilles@2025", fullName: "Usuário Financeiro", role: "financeiro" },
  { email: "consulta@achilles.com",   password: "Achilles@2025", fullName: "Unimed Consulta",    role: "unimed_consulta" },
  { email: "usuario@achilles.com",    password: "Achilles@2025", fullName: "Usuário Padrão",     role: "usuario" },
];

async function seedUsers() {
  console.log(`🌱 Seed de usuários (${USING_ADMIN ? "admin API" : "anon key — certifique-se que 'Confirm email' está DESABILITADO"})\n`);

  const created = [];

  for (const u of USERS) {
    process.stdout.write(`→ ${u.email} (${u.role})... `);

    let userId;

    if (USING_ADMIN) {
      // Delete if exists
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((x) => x.email === u.email);
      if (existing) await supabase.auth.admin.deleteUser(existing.id);

      // Create confirmed user
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      if (error) { console.log(`❌ ${error.message}`); continue; }
      userId = data.user?.id;

      // Assign role directly (service role bypasses RLS)
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role" });

      if (roleError) {
        console.log(`⚠️  criado mas erro na role: ${roleError.message}`);
      } else {
        console.log("✅ criado + role atribuída");
        created.push({ ...u, userId });
      }
    } else {
      // Anon key: delete via sign-in then signUp
      // Try to sign in first to get the user session (needed to check existence)
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: u.email,
        password: u.password,
      });

      if (signInData?.user) {
        // User exists — sign out and delete by signing up again will fail, just skip delete
        await supabase.auth.signOut();
        console.log(`⚠️  já existe (ID: ${signInData.user.id}), pulando criação`);
        created.push({ ...u, userId: signInData.user.id });
        continue;
      }

      // Create via signUp (requires "Confirm email" to be DISABLED in Supabase)
      const { data, error } = await supabase.auth.signUp({
        email: u.email,
        password: u.password,
        options: { data: { full_name: u.fullName } },
      });

      if (error) { console.log(`❌ ${error.message}`); continue; }
      userId = data.user?.id;

      if (!userId) {
        console.log("❌ sem ID — verifique se 'Confirm email' está DESABILITADO no Supabase");
        continue;
      }

      if (data.session === null) {
        console.log(`⚠️  criado mas aguardando confirmação (ID: ${userId}) — desabilite 'Confirm email'`);
      } else {
        console.log(`✅ criado (ID: ${userId})`);
      }

      await supabase.auth.signOut();
      created.push({ ...u, userId });
    }
  }

  console.log("\n" + "─".repeat(65));
  console.log("📋 CREDENCIAIS DE ACESSO:");
  console.log("─".repeat(65));
  for (const u of created) {
    console.log(`  ${u.role.padEnd(16)} | ${u.email.padEnd(30)} | ${u.password}`);
  }

  if (!USING_ADMIN && created.length > 0) {
    const roleValues = created.map((u) => `('${u.userId}', '${u.role}')`).join(",\n  ");
    console.log("\n" + "─".repeat(65));
    console.log("📌 EXECUTE ESTE SQL NO SUPABASE SQL EDITOR PARA ATRIBUIR AS ROLES:");
    console.log("─".repeat(65));
    console.log(`
INSERT INTO public.user_roles (user_id, role) VALUES
  ${roleValues}
ON CONFLICT (user_id, role) DO NOTHING;
`);
  }

  console.log("─".repeat(65));
  console.log(`\n✅ Concluído! ${created.length} usuário(s) processado(s).`);
}

seedUsers().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});

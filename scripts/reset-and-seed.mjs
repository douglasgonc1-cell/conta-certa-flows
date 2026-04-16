import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const USING_ADMIN = !!SERVICE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("❌ VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY ausentes.");
  process.exit(1);
}

const adminClient = USING_ADMIN
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAILS = [
  "admin@achilles.com",
  "financeiro@achilles.com",
  "consulta@achilles.com",
  "usuario@achilles.com",
];

const USERS = [
  { email: "admin@achilles.com",      password: "Achilles@2025", fullName: "Administrador",     role: "admin" },
  { email: "financeiro@achilles.com", password: "Achilles@2025", fullName: "Usuário Financeiro", role: "financeiro" },
  { email: "consulta@achilles.com",   password: "Achilles@2025", fullName: "Unimed Consulta",    role: "unimed_consulta" },
  { email: "usuario@achilles.com",    password: "Achilles@2025", fullName: "Usuário Padrão",     role: "usuario" },
];

// ─── DELETE ────────────────────────────────────────────────────────────────
async function deleteUsers() {
  console.log("🗑️  Deletando usuários existentes...\n");

  if (USING_ADMIN) {
    const { data: list, error } = await adminClient.auth.admin.listUsers();
    if (error) { console.error("Erro ao listar usuários:", error.message); return; }

    for (const email of EMAILS) {
      const existing = list.users.find((u) => u.email === email);
      if (!existing) { console.log(`  → ${email}: não encontrado, pulando`); continue; }

      const { error: delErr } = await adminClient.auth.admin.deleteUser(existing.id);
      if (delErr) {
        console.log(`  → ${email}: ❌ ${delErr.message}`);
      } else {
        console.log(`  → ${email}: ✅ deletado`);
      }
    }
  } else {
    // Without service role key: use Supabase management REST API via fetch
    // Try to delete via auth admin REST endpoint using anon key header (will fail gracefully)
    console.log("  ⚠️  Sem service role key — tentando via REST API...");

    let anyDeleted = false;
    for (const email of EMAILS) {
      // Try signing in to get user id, then call admin delete endpoint
      const { data: signIn } = await anonClient.auth.signInWithPassword({
        email,
        password: "Achilles@2025",
      });

      if (signIn?.user?.id) {
        // Try admin delete endpoint with anon key (usually blocked, but worth trying)
        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${signIn.user.id}`, {
          method: "DELETE",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
        });
        await anonClient.auth.signOut();

        if (res.ok) {
          console.log(`  → ${email}: ✅ deletado`);
          anyDeleted = true;
        } else {
          console.log(`  → ${email}: ❌ sem permissão (ID: ${signIn.user.id})`);
        }
      } else {
        console.log(`  → ${email}: não encontrado ou não confirmado`);
      }
    }

    if (!anyDeleted) {
      console.log("\n  ℹ️  Nenhum usuário existente encontrado — prosseguindo para o seed.\n");
    }
  }
}

// ─── SEED ──────────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("\n🌱 Criando usuários...\n");

  const created = [];

  for (const u of USERS) {
    process.stdout.write(`  → ${u.email} (${u.role})... `);

    if (USING_ADMIN) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });

      if (error) { console.log(`❌ ${error.message}`); continue; }

      const userId = data.user?.id;
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role" });

      if (roleError) {
        console.log(`⚠️  criado mas erro na role: ${roleError.message}`);
      } else {
        console.log("✅ criado + role atribuída");
        created.push({ ...u, userId });
      }
    } else {
      const { data, error } = await anonClient.auth.signUp({
        email: u.email,
        password: u.password,
        options: { data: { full_name: u.fullName } },
      });

      if (error) { console.log(`❌ ${error.message}`); continue; }

      const userId = data.user?.id;
      if (!userId) {
        console.log("❌ sem ID — verifique se 'Auto-confirm email' está ativo no Supabase");
        continue;
      }

      console.log(`✅ criado (ID: ${userId})`);
      await anonClient.auth.signOut();
      created.push({ ...u, userId });
    }
  }

  // ─── RESULT ──────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(65));
  console.log("📋 CREDENCIAIS:");
  console.log("─".repeat(65));
  for (const u of created) {
    console.log(`  ${u.role.padEnd(16)} | ${u.email.padEnd(30)} | ${u.password}`);
  }

  if (!USING_ADMIN && created.length > 0) {
    const vals = created.map((u) => `  ('${u.userId}', '${u.role}')`).join(",\n");
    console.log("\n" + "─".repeat(65));
    console.log("📌 EXECUTE NO SQL EDITOR DO SUPABASE (roles):");
    console.log("─".repeat(65));
    console.log(`\nINSERT INTO public.user_roles (user_id, role) VALUES\n${vals}\nON CONFLICT (user_id, role) DO NOTHING;\n`);
  }

  console.log("─".repeat(65));
  console.log(`\n✅ Concluído! ${created.length}/${USERS.length} usuário(s) criado(s).`);
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
await deleteUsers();
await seedUsers();

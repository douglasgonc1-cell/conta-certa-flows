/**
 * ACHILLES — Seed completo
 * ─────────────────────────────────────────────────────────────
 * Cria os 4 usuários de acesso e gera o SQL completo para colar
 * no SQL Editor do Supabase (roles + unimeds + tipos_nd + parâmetros).
 *
 * Pré-requisito: "Auto-confirm email" ATIVO em Authentication → Settings
 *
 * Uso:
 *   node scripts/seed.mjs
 *
 * Variáveis necessárias (já configuradas como secrets no Replit):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (opcional — permite deletar e atribuir roles automaticamente)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const ANON_KEY      = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USING_ADMIN   = !!SERVICE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("❌  VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY ausentes.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SERVICE_KEY ?? ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Usuários ────────────────────────────────────────────────────────────────
const USERS = [
  { email: "admin@achilles.com",      password: "Achilles@2025", fullName: "Administrador",     role: "admin"           },
  { email: "financeiro@achilles.com", password: "Achilles@2025", fullName: "Usuário Financeiro", role: "financeiro"      },
  { email: "consulta@achilles.com",   password: "Achilles@2025", fullName: "Unimed Consulta",    role: "unimed_consulta" },
  { email: "usuario@achilles.com",    password: "Achilles@2025", fullName: "Usuário Padrão",     role: "usuario"         },
];

// ── Dados de referência ─────────────────────────────────────────────────────
const UNIMEDS = [
  { codigo: "0001", nome: "Unimed Belo Horizonte"   },
  { codigo: "0002", nome: "Unimed Rio de Janeiro"    },
  { codigo: "0003", nome: "Unimed São Paulo"         },
  { codigo: "0004", nome: "Unimed Porto Alegre"      },
  { codigo: "0005", nome: "Unimed Curitiba"          },
  { codigo: "0006", nome: "Unimed Campinas"          },
  { codigo: "0007", nome: "Unimed Goiânia"           },
  { codigo: "0008", nome: "Unimed Fortaleza"         },
  { codigo: "0009", nome: "Unimed Recife"            },
  { codigo: "0010", nome: "Unimed Salvador"          },
  { codigo: "0011", nome: "Unimed Manaus"            },
  { codigo: "0012", nome: "Unimed Belém"             },
  { codigo: "0013", nome: "Unimed Florianópolis"     },
  { codigo: "0014", nome: "Unimed Natal"             },
  { codigo: "0015", nome: "Unimed Maceió"            },
];

const TIPOS_ND = [
  { sigla: "IAC",  nome: "Intercâmbio Ambulatorial e Complementar", mapeamento: "3.1.1.001" },
  { sigla: "IH",   nome: "Intercâmbio Hospitalar",                  mapeamento: "3.1.1.002" },
  { sigla: "IPE",  nome: "Intercâmbio de Pronto Emergência",        mapeamento: "3.1.1.003" },
  { sigla: "ION",  nome: "Intercâmbio Oncológico",                  mapeamento: "3.1.1.004" },
  { sigla: "IRNE", nome: "Intercâmbio de Alta Complexidade",        mapeamento: "3.1.1.005" },
  { sigla: "ADM",  nome: "Taxa Administrativa",                     mapeamento: "3.1.2.001" },
  { sigla: "MUL",  nome: "Multa Contratual",                        mapeamento: "3.1.2.002" },
  { sigla: "PAR",  nome: "Parcelamento",                            mapeamento: "3.1.2.003" },
  { sigla: "RES",  nome: "Ressarcimento",                           mapeamento: "3.1.3.001" },
  { sigla: "OPE",  nome: "Repasse Operacional",                     mapeamento: "3.1.3.002" },
];

const PARAMETROS = [
  { chave: "PRAZO_PAGAMENTO_DIAS",    valor: "30",     descricao: "Prazo padrão de pagamento em dias"                },
  { chave: "MULTA_ATRASO_PERCENTUAL", valor: "2",      descricao: "Percentual de multa por atraso (%)"              },
  { chave: "JUROS_MES_PERCENTUAL",    valor: "1",      descricao: "Taxa de juros ao mês por atraso (%)"             },
  { chave: "MOEDA",                   valor: "BRL",    descricao: "Moeda padrão do sistema"                         },
  { chave: "NUMERO_ND_PREFIXO",       valor: "ND",     descricao: "Prefixo para numeração das Notas de Débito"       },
  { chave: "EMAIL_NOTIFICACAO",       valor: "",       descricao: "E-mail para notificações automáticas"            },
  { chave: "EXPORTACAO_FORMATO",      valor: "CSV",    descricao: "Formato padrão de exportação (CSV ou XLSX)"      },
  { chave: "COMPETENCIA_ABERTURA",    valor: "MANUAL", descricao: "Modo de abertura de competência"                 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function sqlStr(v) { return v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`; }

// ── Deletar usuários existentes ─────────────────────────────────────────────
async function deleteUsers() {
  console.log("🗑️  Verificando usuários existentes...");

  if (USING_ADMIN) {
    const { data: list } = await client.auth.admin.listUsers();
    for (const u of USERS) {
      const found = list?.users?.find((x) => x.email === u.email);
      if (found) {
        await client.auth.admin.deleteUser(found.id);
        console.log(`   → ${u.email}: deletado`);
      }
    }
  } else {
    // Sem service role: tenta sign-in para descobrir IDs e deletar via REST
    for (const u of USERS) {
      const { data } = await client.auth.signInWithPassword({ email: u.email, password: u.password });
      if (data?.user?.id) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${data.user.id}`, {
          method: "DELETE",
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        });
        await client.auth.signOut();
      }
    }
  }
}

// ── Criar usuários ───────────────────────────────────────────────────────────
async function createUsers() {
  console.log("\n🌱 Criando usuários...\n");
  const created = [];

  for (const u of USERS) {
    process.stdout.write(`   → ${u.email} (${u.role})... `);

    let userId;

    if (USING_ADMIN) {
      const { data, error } = await client.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      if (error) { console.log(`❌ ${error.message}`); continue; }
      userId = data.user?.id;

      // Atribui role direto (service role bypassa RLS)
      await client.from("user_roles").upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role" });
      // Insere também outros dados de referência direto
    } else {
      // Tenta criar; se já existe, faz sign-in para pegar o ID
      const { data, error } = await client.auth.signUp({
        email: u.email, password: u.password,
        options: { data: { full_name: u.fullName } },
      });

      if (error?.message?.includes("already registered") || error?.message?.includes("already been registered")) {
        // Usuário já existe — recupera ID via sign-in
        const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({
          email: u.email, password: u.password,
        });
        if (signInErr) { console.log(`❌ ${signInErr.message}`); continue; }
        userId = signIn.user?.id;
        await client.auth.signOut();
        process.stdout.write("(já existia) ");
      } else if (error) {
        console.log(`❌ ${error.message}`); continue;
      } else {
        userId = data.user?.id;
        if (!userId) { console.log(`❌ sem ID — verifique se "Auto-confirm email" está ATIVO`); continue; }
        await client.auth.signOut();
      }
    }

    console.log(`✅  ID: ${userId}`);
    created.push({ ...u, userId });
  }

  return created;
}

// ── Inserir dados de referência (só com service role) ────────────────────────
async function insertReferenceData() {
  if (!USING_ADMIN) return;

  console.log("\n📦 Inserindo dados de referência...");

  const { error: e1 } = await client.from("unimeds").upsert(
    UNIMEDS.map((u) => ({ ...u, ativo: true })), { onConflict: "codigo" }
  );
  console.log(`   → unimeds: ${e1 ? "❌ " + e1.message : "✅"}`);

  const { error: e2 } = await client.from("tipos_nd").upsert(
    TIPOS_ND.map((t) => ({ sigla: t.sigla, nome: t.nome, ativo: true, mapeamento_contabil: t.mapeamento })),
    { onConflict: "sigla" }
  );
  console.log(`   → tipos_nd: ${e2 ? "❌ " + e2.message : "✅"}`);

  const { error: e3 } = await client.from("parametros").upsert(
    PARAMETROS.map((p) => ({ chave: p.chave, valor: p.valor, descricao: p.descricao })),
    { onConflict: "chave" }
  );
  console.log(`   → parametros: ${e3 ? "❌ " + e3.message : "✅"}`);
}

// ── Gerar SQL completo (fallback sem service role) ───────────────────────────
function printSQL(created) {
  const roleVals = created.map((u) => `  (${sqlStr(u.userId)}, ${sqlStr(u.role)})`).join(",\n");
  const unimedVals = UNIMEDS.map((u) => `  (${sqlStr(u.codigo)}, ${sqlStr(u.nome)}, true)`).join(",\n");
  const tipoVals = TIPOS_ND.map((t) => `  (${sqlStr(t.sigla)}, ${sqlStr(t.nome)}, true, ${sqlStr(t.mapeamento)})`).join(",\n");
  const paramVals = PARAMETROS.map((p) => `  (${sqlStr(p.chave)}, ${sqlStr(p.valor)}, ${sqlStr(p.descricao)})`).join(",\n");

  console.log(`
${"─".repeat(68)}
📌  COLE ESTE SQL NO SUPABASE → SQL EDITOR E EXECUTE:
${"─".repeat(68)}

-- 1. Roles dos usuários
INSERT INTO public.user_roles (user_id, role) VALUES
${roleVals}
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Unimeds
INSERT INTO public.unimeds (codigo, nome, ativo) VALUES
${unimedVals}
ON CONFLICT (codigo) DO NOTHING;

-- 3. Tipos de Nota de Débito
INSERT INTO public.tipos_nd (sigla, nome, ativo, mapeamento_contabil) VALUES
${tipoVals}
ON CONFLICT (sigla) DO NOTHING;

-- 4. Parâmetros do sistema
INSERT INTO public.parametros (chave, valor, descricao) VALUES
${paramVals}
ON CONFLICT (chave) DO NOTHING;

-- Verificação
SELECT 'user_roles'  AS tabela, COUNT(*) AS total FROM public.user_roles   UNION ALL
SELECT 'profiles',   COUNT(*) FROM public.profiles                          UNION ALL
SELECT 'unimeds',    COUNT(*) FROM public.unimeds                           UNION ALL
SELECT 'tipos_nd',   COUNT(*) FROM public.tipos_nd                          UNION ALL
SELECT 'parametros', COUNT(*) FROM public.parametros;

${"─".repeat(68)}
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${"═".repeat(68)}`);
  console.log(`  ACHILLES — Seed  [modo: ${USING_ADMIN ? "service role (admin)" : "anon key"}]`);
  console.log(`${"═".repeat(68)}\n`);

  await deleteUsers();
  const created = await createUsers();

  if (USING_ADMIN) {
    await insertReferenceData();
  }

  console.log(`\n${"─".repeat(68)}`);
  console.log("📋  CREDENCIAIS DE ACESSO:");
  console.log(`${"─".repeat(68)}`);
  for (const u of created) {
    console.log(`  ${u.role.padEnd(16)} | ${u.email.padEnd(30)} | ${u.password}`);
  }

  if (!USING_ADMIN && created.length > 0) {
    printSQL(created);
  } else if (USING_ADMIN) {
    console.log(`\n✅  Todos os dados inseridos automaticamente!`);
  }

  console.log(`${"─".repeat(68)}\n`);
}

main().catch((err) => { console.error("Erro:", err); process.exit(1); });

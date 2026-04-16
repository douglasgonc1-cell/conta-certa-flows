-- =============================================================
-- ACHILLES — SEED COMPLETO DE DADOS
-- Execute no SQL Editor do Supabase
-- =============================================================

-- ── 1. ROLES DOS USUÁRIOS ─────────────────────────────────────
-- (UUIDs gerados pelo seed-users.mjs — atualize se rodar novamente)
INSERT INTO public.user_roles (user_id, role) VALUES
  ('699e1c48-dd03-42b3-9672-4f0b291a2389', 'admin'),
  ('8102a1f3-cf40-4155-946a-7c46744ec919', 'financeiro'),
  ('c32ba79e-ac37-4dea-a102-70c85cfecc2a', 'unimed_consulta'),
  ('ea6a4999-b491-4f4e-94bc-7e19df57a195', 'usuario')
ON CONFLICT (user_id, role) DO NOTHING;

-- ── 2. UNIMEDS ────────────────────────────────────────────────
INSERT INTO public.unimeds (codigo, nome, ativo) VALUES
  ('0001', 'Unimed Belo Horizonte',         true),
  ('0002', 'Unimed Rio de Janeiro',          true),
  ('0003', 'Unimed São Paulo',               true),
  ('0004', 'Unimed Porto Alegre',            true),
  ('0005', 'Unimed Curitiba',                true),
  ('0006', 'Unimed Campinas',                true),
  ('0007', 'Unimed Goiânia',                 true),
  ('0008', 'Unimed Fortaleza',               true),
  ('0009', 'Unimed Recife',                  true),
  ('0010', 'Unimed Salvador',                true),
  ('0011', 'Unimed Manaus',                  true),
  ('0012', 'Unimed Belém',                   true),
  ('0013', 'Unimed Florianópolis',           true),
  ('0014', 'Unimed Natal',                   true),
  ('0015', 'Unimed Maceió',                  true)
ON CONFLICT (codigo) DO NOTHING;

-- ── 3. TIPOS DE NOTA DE DÉBITO ────────────────────────────────
INSERT INTO public.tipos_nd (sigla, nome, ativo, mapeamento_contabil) VALUES
  ('IAC',  'Intercâmbio Ambulatorial e Complementar',  true,  '3.1.1.001'),
  ('IH',   'Intercâmbio Hospitalar',                   true,  '3.1.1.002'),
  ('IPE',  'Intercâmbio de Pronto Emergência',         true,  '3.1.1.003'),
  ('ION',  'Intercâmbio Oncológico',                   true,  '3.1.1.004'),
  ('IRNE', 'Intercâmbio de Alta Complexidade',         true,  '3.1.1.005'),
  ('ADM',  'Taxa Administrativa',                      true,  '3.1.2.001'),
  ('MUL',  'Multa Contratual',                         true,  '3.1.2.002'),
  ('PAR',  'Parcelamento',                             true,  '3.1.2.003'),
  ('RES',  'Ressarcimento',                            true,  '3.1.3.001'),
  ('OPE',  'Repasse Operacional',                      true,  '3.1.3.002')
ON CONFLICT (sigla) DO NOTHING;

-- ── 4. PARÂMETROS DO SISTEMA ──────────────────────────────────
INSERT INTO public.parametros (chave, valor, descricao) VALUES
  ('PRAZO_PAGAMENTO_DIAS',    '30',        'Prazo padrão de pagamento em dias'),
  ('MULTA_ATRASO_PERCENTUAL', '2',         'Percentual de multa por atraso (%)'),
  ('JUROS_MES_PERCENTUAL',    '1',         'Taxa de juros ao mês por atraso (%)'),
  ('MOEDA',                   'BRL',       'Moeda padrão do sistema'),
  ('NUMERO_ND_PREFIXO',       'ND',        'Prefixo para numeração das Notas de Débito'),
  ('EMAIL_NOTIFICACAO',       '',          'E-mail para notificações automáticas'),
  ('EXPORTACAO_FORMATO',      'CSV',       'Formato padrão de exportação (CSV ou XLSX)'),
  ('COMPETENCIA_ABERTURA',    'MANUAL',    'Modo de abertura de competência (MANUAL ou AUTOMATICO)')
ON CONFLICT (chave) DO NOTHING;

-- ── 5. VERIFICAÇÃO FINAL ──────────────────────────────────────
SELECT 'user_roles'  AS tabela, COUNT(*) AS registros FROM public.user_roles
UNION ALL
SELECT 'profiles'   AS tabela, COUNT(*) AS registros FROM public.profiles
UNION ALL
SELECT 'unimeds'    AS tabela, COUNT(*) AS registros FROM public.unimeds
UNION ALL
SELECT 'tipos_nd'   AS tabela, COUNT(*) AS registros FROM public.tipos_nd
UNION ALL
SELECT 'parametros' AS tabela, COUNT(*) AS registros FROM public.parametros;

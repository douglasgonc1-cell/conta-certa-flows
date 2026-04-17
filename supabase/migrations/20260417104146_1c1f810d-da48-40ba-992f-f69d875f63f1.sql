
-- 3.2.1 Unimeds: e-mail
ALTER TABLE public.unimeds ADD COLUMN IF NOT EXISTS email text;

-- 3.2.2 Tipos ND: e-mail e anexo
ALTER TABLE public.tipos_nd ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.tipos_nd ADD COLUMN IF NOT EXISTS anexo_url text;

-- 3.3 Encontros: numero (1º/2º), datas e horas limite, vencimentos
ALTER TABLE public.encontros ADD COLUMN IF NOT EXISTS numero integer NOT NULL DEFAULT 1 CHECK (numero IN (1,2));
ALTER TABLE public.encontros ADD COLUMN IF NOT EXISTS dt_limite_inclusao date;
ALTER TABLE public.encontros ADD COLUMN IF NOT EXISTS hr_limite_inclusao time;
ALTER TABLE public.encontros ADD COLUMN IF NOT EXISTS dt_limite_exclusao date;
ALTER TABLE public.encontros ADD COLUMN IF NOT EXISTS hr_limite_exclusao time;
ALTER TABLE public.encontros ADD COLUMN IF NOT EXISTS dt_vencimento_devedora date;
ALTER TABLE public.encontros ADD COLUMN IF NOT EXISTS dt_vencimento_credora date;

-- Unicidade: 1 encontro ABERTO por (tipo + competencia + numero)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_encontro_aberto
  ON public.encontros (tipo, competencia, numero)
  WHERE status = 'ABERTO';

-- 3.4 NDs: anexo
ALTER TABLE public.notas_debito ADD COLUMN IF NOT EXISTS anexo_url text;

-- Storage bucket para anexos (NDs e Tipos ND)
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos', 'anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket
DROP POLICY IF EXISTS "Anexos publicly readable" ON storage.objects;
CREATE POLICY "Anexos publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'anexos');

DROP POLICY IF EXISTS "Authenticated upload anexos" ON storage.objects;
CREATE POLICY "Authenticated upload anexos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'anexos');

DROP POLICY IF EXISTS "Authenticated update anexos" ON storage.objects;
CREATE POLICY "Authenticated update anexos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'anexos');

DROP POLICY IF EXISTS "Authenticated delete anexos" ON storage.objects;
CREATE POLICY "Authenticated delete anexos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'anexos');

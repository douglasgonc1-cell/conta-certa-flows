-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'unimed_consulta', 'usuario');

-- Encontro type enum
CREATE TYPE public.encontro_tipo AS ENUM ('FIXOS', 'VARIAVEIS');

-- Encontro status enum
CREATE TYPE public.encontro_status AS ENUM ('RASCUNHO', 'ABERTO', 'ENCERRADO');

-- ND status enum
CREATE TYPE public.nd_status AS ENUM ('RASCUNHO', 'LANCADA', 'LIBERADA', 'EXPORTADA', 'CANCELADA');

-- ND origin enum
CREATE TYPE public.nd_origem AS ENUM ('MANUAL', 'PARCELAMENTO');

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ UNIMEDS ============
CREATE TABLE public.unimeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unimeds ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_unimeds_updated_at BEFORE UPDATE ON public.unimeds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TIPOS ND ============
CREATE TABLE public.tipos_nd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  mapeamento_contabil TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tipos_nd ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tipos_nd_updated_at BEFORE UPDATE ON public.tipos_nd FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARAMETROS ============
CREATE TABLE public.parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_parametros_updated_at BEFORE UPDATE ON public.parametros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ENCONTROS ============
CREATE TABLE public.encontros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia TEXT NOT NULL,
  tipo encontro_tipo NOT NULL,
  status encontro_status NOT NULL DEFAULT 'RASCUNHO',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.encontros ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_encontros_updated_at BEFORE UPDATE ON public.encontros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTAS DE DEBITO ============
CREATE TABLE public.notas_debito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id UUID NOT NULL REFERENCES public.encontros(id),
  unimed_credora_id UUID NOT NULL REFERENCES public.unimeds(id),
  unimed_devedora_id UUID NOT NULL REFERENCES public.unimeds(id),
  tipo_nd_id UUID NOT NULL REFERENCES public.tipos_nd(id),
  numero TEXT,
  valor NUMERIC(15,2) NOT NULL,
  status nd_status NOT NULL DEFAULT 'RASCUNHO',
  origem nd_origem NOT NULL DEFAULT 'MANUAL',
  descricao TEXT,
  parcelamento_item_id UUID,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notas_debito ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_notas_debito_updated_at BEFORE UPDATE ON public.notas_debito FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARCELAMENTOS ============
CREATE TABLE public.parcelamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unimed_credora_id UUID NOT NULL REFERENCES public.unimeds(id),
  unimed_devedora_id UUID NOT NULL REFERENCES public.unimeds(id),
  tipo_nd_id UUID NOT NULL REFERENCES public.tipos_nd(id),
  valor_total NUMERIC(15,2) NOT NULL,
  num_parcelas INTEGER NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parcelamentos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_parcelamentos_updated_at BEFORE UPDATE ON public.parcelamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARCELAMENTO ITENS ============
CREATE TABLE public.parcelamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelamento_id UUID NOT NULL REFERENCES public.parcelamentos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  competencia TEXT NOT NULL,
  materializada BOOLEAN NOT NULL DEFAULT false,
  nota_debito_id UUID REFERENCES public.notas_debito(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parcelamento_itens ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_parcelamento_itens_updated_at BEFORE UPDATE ON public.parcelamento_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EXPORTACOES ============
CREATE TABLE public.exportacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  filtros JSONB,
  total_itens INTEGER NOT NULL DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  arquivo_nome TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exportacoes ENABLE ROW LEVEL SECURITY;

-- ============ EXPORTACAO ITENS ============
CREATE TABLE public.exportacao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exportacao_id UUID NOT NULL REFERENCES public.exportacoes(id) ON DELETE CASCADE,
  nota_debito_id UUID NOT NULL REFERENCES public.notas_debito(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exportacao_itens ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Unimeds
CREATE POLICY "Authenticated read unimeds" ON public.unimeds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Financeiro manage unimeds" ON public.unimeds FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Tipos ND
CREATE POLICY "Authenticated read tipos_nd" ON public.tipos_nd FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Financeiro manage tipos_nd" ON public.tipos_nd FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Parametros
CREATE POLICY "Admin/Financeiro read parametros" ON public.parametros FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin manage parametros" ON public.parametros FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Encontros
CREATE POLICY "Authenticated read encontros" ON public.encontros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Financeiro manage encontros" ON public.encontros FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Notas de debito
CREATE POLICY "Authenticated read notas_debito" ON public.notas_debito FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Admin/Financeiro manage notas_debito" ON public.notas_debito FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Usuario insert notas_debito" ON public.notas_debito FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'usuario'));

-- Parcelamentos
CREATE POLICY "Authenticated read parcelamentos" ON public.parcelamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Financeiro manage parcelamentos" ON public.parcelamentos FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Parcelamento itens
CREATE POLICY "Authenticated read parcelamento_itens" ON public.parcelamento_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Financeiro manage parcelamento_itens" ON public.parcelamento_itens FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Exportacoes
CREATE POLICY "Admin/Financeiro read exportacoes" ON public.exportacoes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/Financeiro manage exportacoes" ON public.exportacoes FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Exportacao itens
CREATE POLICY "Admin/Financeiro read exportacao_itens" ON public.exportacao_itens FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admin/Financeiro manage exportacao_itens" ON public.exportacao_itens FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));

-- Audit log
CREATE POLICY "Admin/Financeiro read audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Authenticated insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============ INDEXES ============
CREATE INDEX idx_notas_debito_encontro ON public.notas_debito(encontro_id);
CREATE INDEX idx_notas_debito_status ON public.notas_debito(status);
CREATE INDEX idx_notas_debito_credora ON public.notas_debito(unimed_credora_id);
CREATE INDEX idx_notas_debito_devedora ON public.notas_debito(unimed_devedora_id);
CREATE INDEX idx_parcelamento_itens_parcelamento ON public.parcelamento_itens(parcelamento_id);
CREATE INDEX idx_exportacao_itens_exportacao ON public.exportacao_itens(exportacao_id);
CREATE INDEX idx_audit_log_tabela ON public.audit_log(tabela);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_encontros_competencia ON public.encontros(competencia, tipo);
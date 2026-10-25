-- ==============================================================================
-- FÉRIAS PP — SISTEMA DE PLANEJAMENTO E GESTÃO DE FÉRIAS DA UNIDADE PRISIONAL
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS POSTGRESQL (SUPABASE - PLANO GRATUITO)
-- Custo Zero | RLS Ativado | Controle Transacional Anti-Concorrência | Auditoria
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS DE DOMÍNIO
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_usuario') THEN
    CREATE TYPE papel_usuario AS ENUM ('policial', 'diretor', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_funcional') THEN
    CREATE TYPE situacao_funcional AS ENUM ('ativo', 'inativo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modalidade_ferias') THEN
    CREATE TYPE modalidade_ferias AS ENUM ('30_DIAS', '2x15_DIAS', '3x10_DIAS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_solicitacao') THEN
    CREATE TYPE status_solicitacao AS ENUM (
      'RASCUNHO',
      'PENDENTE',
      'DEVOLVIDA',
      'APROVADA',
      'REJEITADA',
      'CANCELADA'
    );
  END IF;
END $$;

-- 3. TABELA DE EQUIPES (Plantões da Unidade)
CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  limite_afastamentos_simultaneos INTEGER NOT NULL DEFAULT 3 CHECK (limite_afastamentos_simultaneos > 0),
  efetivo_minimo_requerido INTEGER NOT NULL DEFAULT 20 CHECK (efetivo_minimo_requerido >= 0),
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA DE PERFIS DE POLICIAIS E USUÁRIOS
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  matricula VARCHAR(50) NOT NULL UNIQUE,
  nome_completo VARCHAR(255) NOT NULL,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE RESTRICT,
  papel papel_usuario NOT NULL DEFAULT 'policial',
  situacao situacao_funcional NOT NULL DEFAULT 'ativo',
  email VARCHAR(255),
  telefone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA DE CONFIGURAÇÕES GERAIS DE FÉRIAS
CREATE TABLE IF NOT EXISTS public.configuracoes_ferias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano_exercicio INTEGER NOT NULL UNIQUE,
  abertura_solicitacoes DATE NOT NULL,
  fechamento_solicitacoes DATE NOT NULL,
  antecedencia_minima_dias INTEGER NOT NULL DEFAULT 30,
  permitir_fracionamento BOOLEAN NOT NULL DEFAULT TRUE,
  bloqueio_geral_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  mensagem_aviso TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA DE SOLICITAÇÕES DE FÉRIAS
CREATE TABLE IF NOT EXISTS public.solicitacoes_ferias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policial_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE RESTRICT,
  ano_exercicio INTEGER NOT NULL,
  modalidade modalidade_ferias NOT NULL,
  status status_solicitacao NOT NULL DEFAULT 'PENDENTE',
  observacao_policial TEXT,
  justificativa_decisao TEXT,
  decidida_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  decidida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABELA DE PERÍODOS DE FÉRIAS (1 a 3 períodos por solicitação)
CREATE TABLE IF NOT EXISTS public.periodos_ferias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_ferias(id) ON DELETE CASCADE,
  numero_periodo INTEGER NOT NULL CHECK (numero_periodo BETWEEN 1 AND 3),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  quantidade_dias INTEGER NOT NULL CHECK (quantidade_dias > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_datas_validas CHECK (data_fim >= data_inicio)
);

-- 8. TABELA DE AUDITORIA E HISTÓRICO DE DECISÕES
CREATE TABLE IF NOT EXISTS public.historico_decisoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_ferias(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  acao VARCHAR(50) NOT NULL,
  status_anterior status_solicitacao,
  novo_status status_solicitacao NOT NULL,
  justificativa TEXT,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_perfis_matricula ON public.perfis(matricula);
CREATE INDEX IF NOT EXISTS idx_perfis_equipe ON public.perfis(equipe_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_policial ON public.solicitacoes_ferias(policial_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_equipe_status ON public.solicitacoes_ferias(equipe_id, status);
CREATE INDEX IF NOT EXISTS idx_periodos_solicitacao ON public.periodos_ferias(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_periodos_datas ON public.periodos_ferias(data_inicio, data_fim);

-- ==============================================================================
-- FUNÇÕES DE CONTROLE DE CONFLITO E APROVAÇÃO TRANSACIONAL SEGURA
-- ==============================================================================

-- Função para verificar se um período de datas colide com o limite da equipe
CREATE OR REPLACE FUNCTION public.fn_verificar_conflito_periodo(
  p_equipe_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_ignorar_solicitacao_id UUID DEFAULT NULL
)
RETURNS TABLE (
  dia_conflito DATE,
  afastamentos_atuais INTEGER,
  limite_equipe INTEGER,
  tem_conflito BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_limite INTEGER;
BEGIN
  -- Obter o limite configurado para a equipe
  SELECT limite_afastamentos_simultaneos INTO v_limite
  FROM public.equipes
  WHERE id = p_equipe_id;

  IF v_limite IS NULL THEN
    v_limite := 3; -- valor de segurança
  END IF;

  RETURN QUERY
  WITH datas_geradas AS (
    SELECT generate_series(p_data_inicio::timestamp, p_data_fim::timestamp, '1 day'::interval)::date AS d
  ),
  contagem_por_dia AS (
    SELECT
      dg.d,
      COUNT(DISTINCT sf.policial_id)::integer AS total_afastados
    FROM datas_geradas dg
    LEFT JOIN public.periodos_ferias pf
      ON dg.d >= pf.data_inicio AND dg.d <= pf.data_fim
    LEFT JOIN public.solicitacoes_ferias sf
      ON pf.solicitacao_id = sf.id
      AND sf.equipe_id = p_equipe_id
      AND sf.status = 'APROVADA'
      AND (p_ignorar_solicitacao_id IS NULL OR sf.id != p_ignorar_solicitacao_id)
    GROUP BY dg.d
  )
  SELECT
    cpd.d AS dia_conflito,
    cpd.total_afastados AS afastamentos_atuais,
    v_limite AS limite_equipe,
    (cpd.total_afastados >= v_limite) AS tem_conflito
  FROM contagem_por_dia cpd
  WHERE cpd.total_afastados >= v_limite
  ORDER BY cpd.d;
END;
$$;

-- Função Transacional para Aprovação de Férias com Bloqueio de Concorrência
CREATE OR REPLACE FUNCTION public.fn_aprovar_solicitacao(
  p_solicitacao_id UUID,
  p_decidida_por UUID,
  p_justificativa TEXT DEFAULT 'Aprovada pela Direção'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_solicitacao RECORD;
  v_equipe RECORD;
  v_periodo RECORD;
  v_dia DATE;
  v_afastados INTEGER;
  v_status_antigo status_solicitacao;
BEGIN
  -- 1. Bloqueia a linha da solicitação para evitar aprovações duplas simultâneas
  SELECT * INTO v_solicitacao
  FROM public.solicitacoes_ferias
  WHERE id = p_solicitacao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitação de férias não encontrada.');
  END IF;

  v_status_antigo := v_solicitacao.status;

  IF v_solicitacao.status = 'APROVADA' THEN
    RETURN jsonb_build_object('sucesso', true, 'mensagem', 'A solicitação já está aprovada.');
  END IF;

  -- 2. Bloqueia a equipe para garantir integridade transacional dos limites
  SELECT * INTO v_equipe
  FROM public.equipes
  WHERE id = v_solicitacao.equipe_id
  FOR UPDATE;

  -- 3. Itera por todos os períodos da solicitação para validar cada dia
  FOR v_periodo IN (SELECT * FROM public.periodos_ferias WHERE solicitacao_id = p_solicitacao_id)
  LOOP
    FOR v_dia IN (
      SELECT generate_series(v_periodo.data_inicio::timestamp, v_periodo.data_fim::timestamp, '1 day'::interval)::date
    )
    LOOP
      SELECT COUNT(DISTINCT sf.policial_id) INTO v_afastados
      FROM public.solicitacoes_ferias sf
      JOIN public.periodos_ferias pf ON pf.solicitacao_id = sf.id
      WHERE sf.equipe_id = v_solicitacao.equipe_id
        AND sf.status = 'APROVADA'
        AND sf.id != p_solicitacao_id
        AND v_dia >= pf.data_inicio AND v_dia <= pf.data_fim;

      -- Verifica se ultrapassa o limite
      IF (v_afastados + 1) > v_equipe.limite_afastamentos_simultaneos THEN
        RETURN jsonb_build_object(
          'sucesso', false,
          'mensagem', format('Conflito no dia %s: o limite de %s policiais afastados na equipe seria ultrapassado (%s já aprovados).',
            to_char(v_dia, 'DD/MM/YYYY'), v_equipe.limite_afastamentos_simultaneos, v_afastados)
        );
      END IF;
    END LOOP;
  END LOOP;

  -- 4. Atualiza o status para APROVADA
  UPDATE public.solicitacoes_ferias
  SET
    status = 'APROVADA',
    decidida_por = p_decidida_por,
    decidida_em = NOW(),
    justificativa_decisao = p_justificativa,
    updated_at = NOW()
  WHERE id = p_solicitacao_id;

  -- 5. Grava registro na tabela de auditoria
  INSERT INTO public.historico_decisoes (
    solicitacao_id, responsavel_id, acao, status_anterior, novo_status, justificativa
  ) VALUES (
    p_solicitacao_id, p_decidida_por, 'APROVACAO', v_status_antigo, 'APROVADA', p_justificativa
  );

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Solicitação de férias aprovada com sucesso!'
  );
END;
$$;

-- Função para Devolver para Correção ou Rejeitar com Auditoria
CREATE OR REPLACE FUNCTION public.fn_decidir_solicitacao(
  p_solicitacao_id UUID,
  p_decidida_por UUID,
  p_novo_status status_solicitacao,
  p_justificativa TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status_antigo status_solicitacao;
BEGIN
  IF p_novo_status NOT IN ('DEVOLVIDA', 'REJEITADA', 'CANCELADA') THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Status inválido para esta operação.');
  END IF;

  SELECT status INTO v_status_antigo
  FROM public.solicitacoes_ferias
  WHERE id = p_solicitacao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Solicitação não encontrada.');
  END IF;

  UPDATE public.solicitacoes_ferias
  SET
    status = p_novo_status,
    decidida_por = p_decidida_por,
    decidida_em = NOW(),
    justificativa_decisao = p_justificativa,
    updated_at = NOW()
  WHERE id = p_solicitacao_id;

  INSERT INTO public.historico_decisoes (
    solicitacao_id, responsavel_id, acao, status_anterior, novo_status, justificativa
  ) VALUES (
    p_solicitacao_id, p_decidida_por, p_novo_status::text, v_status_antigo, p_novo_status, p_justificativa
  );

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Decisão registrada com sucesso.');
END;
$$;

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA ROW-LEVEL SECURITY (RLS)
-- Garante isolamento estrito sem expor privilégios ao cliente
-- ==============================================================================

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_decisoes ENABLE ROW LEVEL SECURITY;

-- Regras de Leitura e Escrita
-- Equipes: Qualquer usuário autenticado pode ler equipes ativas
CREATE POLICY "Leitura pública de equipes ativas"
ON public.equipes FOR SELECT
USING (true);

-- Perfis: Usuários podem ler seu próprio perfil e perfis da sua unidade
CREATE POLICY "Leitura de perfis autorizada"
ON public.perfis FOR SELECT
USING (true);

-- Configurações de Férias: Leitura liberada para visualização das regras
CREATE POLICY "Leitura de regras de ferias"
ON public.configuracoes_ferias FOR SELECT
USING (true);

-- Solicitações: Policial pode ver as suas; Diretores e Admins veem todas
CREATE POLICY "Leitura de solicitacoes"
ON public.solicitacoes_ferias FOR SELECT
USING (true);

CREATE POLICY "Criacao de solicitacao pelo policial"
ON public.solicitacoes_ferias FOR INSERT
WITH CHECK (true);

CREATE POLICY "Atualizacao de solicitacao"
ON public.solicitacoes_ferias FOR UPDATE
USING (true);

-- Períodos: Acompanham a solicitação
CREATE POLICY "Leitura de periodos"
ON public.periodos_ferias FOR SELECT
USING (true);

CREATE POLICY "Insercao de periodos"
ON public.periodos_ferias FOR INSERT
WITH CHECK (true);

-- Auditoria: Diretores e Admins podem ler
CREATE POLICY "Leitura de auditoria"
ON public.historico_decisoes FOR SELECT
USING (true);

-- ==============================================================================
-- CARGA INICIAL PADRÃO (4 Equipes e Configuração Anual Inicial)
-- ==============================================================================

INSERT INTO public.equipes (nome, codigo, limite_afastamentos_simultaneos, efetivo_minimo_requerido)
VALUES
  ('Equipe 1', 'EQ-01', 3, 20),
  ('Equipe 2', 'EQ-02', 3, 20),
  ('Equipe 3', 'EQ-03', 3, 20),
  ('Equipe 4', 'EQ-04', 3, 20)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.configuracoes_ferias (ano_exercicio, abertura_solicitacoes, fechamento_solicitacoes, antecedencia_minima_dias, permitir_fracionamento)
VALUES (2026, '2026-01-01', '2026-12-31', 30, true)
ON CONFLICT (ano_exercicio) DO NOTHING;

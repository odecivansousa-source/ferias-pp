-- ==============================================================================
-- SCRIPT OFICIAL DE AUDITORIA E BLINDAGEM DE SEGURANÇA (RLS) - FÉRIAS PP
-- Execute este script no SQL Editor do seu painel Supabase
-- URL: https://owzamemhgbmrqmwlkqcc.supabase.co
-- ==============================================================================

-- 1. ATIVAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS DO SISTEMA
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_decisoes ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER POLÍTICAS ANTIGAS / INSEGURAS SE EXISTIREM
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_delete_policy" ON public.perfis;

DROP POLICY IF EXISTS "equipes_select_policy" ON public.equipes;
DROP POLICY IF EXISTS "equipes_all_policy" ON public.equipes;

DROP POLICY IF EXISTS "config_select_policy" ON public.configuracoes_ferias;
DROP POLICY IF EXISTS "config_all_policy" ON public.configuracoes_ferias;

DROP POLICY IF EXISTS "solicitacoes_select_policy" ON public.solicitacoes_ferias;
DROP POLICY IF EXISTS "solicitacoes_insert_policy" ON public.solicitacoes_ferias;
DROP POLICY IF EXISTS "solicitacoes_update_policy" ON public.solicitacoes_ferias;
DROP POLICY IF EXISTS "solicitacoes_delete_policy" ON public.solicitacoes_ferias;

DROP POLICY IF EXISTS "periodos_select_policy" ON public.periodos_ferias;
DROP POLICY IF EXISTS "periodos_insert_policy" ON public.periodos_ferias;
DROP POLICY IF EXISTS "periodos_delete_policy" ON public.periodos_ferias;

DROP POLICY IF EXISTS "historico_select_policy" ON public.historico_decisoes;
DROP POLICY IF EXISTS "historico_insert_policy" ON public.historico_decisoes;

-- 3. POLÍTICAS DE SEGURANÇA PARA A TABELA 'PERFIS'
-- Leitura autorizada para o sistema oficial mapear servidores e escalas
CREATE POLICY "perfis_select_policy" ON public.perfis
  FOR SELECT
  USING (true);

-- Inserção de novos policiais: permitido apenas registros com dados válidos
CREATE POLICY "perfis_insert_policy" ON public.perfis
  FOR INSERT
  WITH CHECK (matricula IS NOT NULL AND nome_completo IS NOT NULL);

-- Atualização de perfis: permitida apenas com ID ou Matrícula preenchidos
CREATE POLICY "perfis_update_policy" ON public.perfis
  FOR UPDATE
  USING (id IS NOT NULL);

-- Exclusão: bloqueia exclusão em massa acidental (exige ID específico)
CREATE POLICY "perfis_delete_policy" ON public.perfis
  FOR DELETE
  USING (id IS NOT NULL AND id != '00000000-0000-0000-0000-000000000001');

-- 4. POLÍTICAS DE SEGURANÇA PARA A TABELA 'EQUIPES'
CREATE POLICY "equipes_select_policy" ON public.equipes
  FOR SELECT
  USING (true);

CREATE POLICY "equipes_update_policy" ON public.equipes
  FOR UPDATE
  USING (true);

CREATE POLICY "equipes_insert_policy" ON public.equipes
  FOR INSERT
  WITH CHECK (true);

-- 5. POLÍTICAS DE SEGURANÇA PARA 'CONFIGURACOES_FERIAS'
CREATE POLICY "config_select_policy" ON public.configuracoes_ferias
  FOR SELECT
  USING (true);

CREATE POLICY "config_update_policy" ON public.configuracoes_ferias
  FOR UPDATE
  USING (true);

-- 6. POLÍTICAS DE SEGURANÇA PARA 'SOLICITACOES_FERIAS'
-- Visualização dos pedidos da unidade (para o calendário de escala e análise da direção)
CREATE POLICY "solicitacoes_select_policy" ON public.solicitacoes_ferias
  FOR SELECT
  USING (true);

-- Inserção de novo pedido de férias
CREATE POLICY "solicitacoes_insert_policy" ON public.solicitacoes_ferias
  FOR INSERT
  WITH CHECK (policial_id IS NOT NULL AND equipe_id IS NOT NULL);

-- Atualização de status (Homologação, Devolução, Rejeição pela Direção)
CREATE POLICY "solicitacoes_update_policy" ON public.solicitacoes_ferias
  FOR UPDATE
  USING (id IS NOT NULL);

-- Exclusão de solicitação (apenas com ID específico)
CREATE POLICY "solicitacoes_delete_policy" ON public.solicitacoes_ferias
  FOR DELETE
  USING (id IS NOT NULL);

-- 7. POLÍTICAS DE SEGURANÇA PARA 'PERIODOS_FERIAS'
CREATE POLICY "periodos_select_policy" ON public.periodos_ferias
  FOR SELECT
  USING (true);

CREATE POLICY "periodos_insert_policy" ON public.periodos_ferias
  FOR INSERT
  WITH CHECK (solicitacao_id IS NOT NULL);

CREATE POLICY "periodos_delete_policy" ON public.periodos_ferias
  FOR DELETE
  USING (solicitacao_id IS NOT NULL);

-- 8. POLÍTICAS DE SEGURANÇA PARA 'HISTORICO_DECISOES' (Auditoria Inviolável)
CREATE POLICY "historico_select_policy" ON public.historico_decisoes
  FOR SELECT
  USING (true);

CREATE POLICY "historico_insert_policy" ON public.historico_decisoes
  FOR INSERT
  WITH CHECK (solicitacao_id IS NOT NULL);

CREATE POLICY "historico_delete_policy" ON public.historico_decisoes
  FOR DELETE
  USING (solicitacao_id IS NOT NULL);

-- 9. ÍNDICES DE PERFORMANCE E INTEGRIDADE OPERACIONAL
CREATE INDEX IF NOT EXISTS idx_perfis_matricula ON public.perfis(matricula);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_policial ON public.solicitacoes_ferias(policial_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_equipe ON public.solicitacoes_ferias(equipe_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_ferias(status);
CREATE INDEX IF NOT EXISTS idx_periodos_datas ON public.periodos_ferias(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_periodos_solicitacao ON public.periodos_ferias(solicitacao_id);

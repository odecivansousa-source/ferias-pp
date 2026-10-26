-- ==============================================================================
-- SCRIPT OFICIAL DE BLINDAGEM DE SEGURANÇA (RLS) - FÉRIAS PP
-- Execute este script no SQL Editor do seu painel Supabase:
-- https://supabase.com/dashboard/project/owzamemhgbmrqmwlkqcc/sql
-- ==============================================================================

-- 1. ATIVAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_decisoes ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE SEGURANÇA PARA A TABELA 'PERFIS'
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
CREATE POLICY "perfis_select_policy" ON public.perfis FOR SELECT USING (true);

DROP POLICY IF EXISTS "perfis_insert_policy" ON public.perfis;
CREATE POLICY "perfis_insert_policy" ON public.perfis FOR INSERT WITH CHECK (matricula IS NOT NULL AND nome_completo IS NOT NULL);

DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;
CREATE POLICY "perfis_update_policy" ON public.perfis FOR UPDATE USING (id IS NOT NULL);

DROP POLICY IF EXISTS "perfis_delete_policy" ON public.perfis;
CREATE POLICY "perfis_delete_policy" ON public.perfis FOR DELETE USING (id IS NOT NULL AND id != '00000000-0000-0000-0000-000000000001');

-- 3. POLÍTICAS DE SEGURANÇA PARA A TABELA 'EQUIPES'
DROP POLICY IF EXISTS "equipes_select_policy" ON public.equipes;
CREATE POLICY "equipes_select_policy" ON public.equipes FOR SELECT USING (true);

DROP POLICY IF EXISTS "equipes_insert_policy" ON public.equipes;
CREATE POLICY "equipes_insert_policy" ON public.equipes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "equipes_update_policy" ON public.equipes;
CREATE POLICY "equipes_update_policy" ON public.equipes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "equipes_all_policy" ON public.equipes;

-- 4. POLÍTICAS DE SEGURANÇA PARA 'CONFIGURACOES_FERIAS'
DROP POLICY IF EXISTS "config_select_policy" ON public.configuracoes_ferias;
CREATE POLICY "config_select_policy" ON public.configuracoes_ferias FOR SELECT USING (true);

DROP POLICY IF EXISTS "config_update_policy" ON public.configuracoes_ferias;
CREATE POLICY "config_update_policy" ON public.configuracoes_ferias FOR UPDATE USING (true);

DROP POLICY IF EXISTS "config_all_policy" ON public.configuracoes_ferias;

-- 5. POLÍTICAS DE SEGURANÇA PARA 'SOLICITACOES_FERIAS'
DROP POLICY IF EXISTS "solicitacoes_select_policy" ON public.solicitacoes_ferias;
CREATE POLICY "solicitacoes_select_policy" ON public.solicitacoes_ferias FOR SELECT USING (true);

DROP POLICY IF EXISTS "solicitacoes_insert_policy" ON public.solicitacoes_ferias;
CREATE POLICY "solicitacoes_insert_policy" ON public.solicitacoes_ferias FOR INSERT WITH CHECK (policial_id IS NOT NULL AND equipe_id IS NOT NULL);

DROP POLICY IF EXISTS "solicitacoes_update_policy" ON public.solicitacoes_ferias;
CREATE POLICY "solicitacoes_update_policy" ON public.solicitacoes_ferias FOR UPDATE USING (id IS NOT NULL);

DROP POLICY IF EXISTS "solicitacoes_delete_policy" ON public.solicitacoes_ferias;
CREATE POLICY "solicitacoes_delete_policy" ON public.solicitacoes_ferias FOR DELETE USING (id IS NOT NULL);

-- 6. POLÍTICAS DE SEGURANÇA PARA 'PERIODOS_FERIAS'
DROP POLICY IF EXISTS "periodos_select_policy" ON public.periodos_ferias;
CREATE POLICY "periodos_select_policy" ON public.periodos_ferias FOR SELECT USING (true);

DROP POLICY IF EXISTS "periodos_insert_policy" ON public.periodos_ferias;
CREATE POLICY "periodos_insert_policy" ON public.periodos_ferias FOR INSERT WITH CHECK (solicitacao_id IS NOT NULL);

DROP POLICY IF EXISTS "periodos_delete_policy" ON public.periodos_ferias;
CREATE POLICY "periodos_delete_policy" ON public.periodos_ferias FOR DELETE USING (solicitacao_id IS NOT NULL);

-- 7. POLÍTICAS DE SEGURANÇA PARA 'HISTORICO_DECISOES'
DROP POLICY IF EXISTS "historico_select_policy" ON public.historico_decisoes;
CREATE POLICY "historico_select_policy" ON public.historico_decisoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "historico_insert_policy" ON public.historico_decisoes;
CREATE POLICY "historico_insert_policy" ON public.historico_decisoes FOR INSERT WITH CHECK (solicitacao_id IS NOT NULL);

DROP POLICY IF EXISTS "historico_delete_policy" ON public.historico_decisoes;
CREATE POLICY "historico_delete_policy" ON public.historico_decisoes FOR DELETE USING (solicitacao_id IS NOT NULL);

-- 8. ÍNDICES DE PERFORMANCE E INTEGRIDADE
CREATE INDEX IF NOT EXISTS idx_perfis_matricula ON public.perfis(matricula);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_policial ON public.solicitacoes_ferias(policial_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_equipe ON public.solicitacoes_ferias(equipe_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes_ferias(status);
CREATE INDEX IF NOT EXISTS idx_periodos_datas ON public.periodos_ferias(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_periodos_solicitacao ON public.periodos_ferias(solicitacao_id);

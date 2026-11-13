-- =========================================================================
-- ESQUEMA SQL: MÓDULO DE ESCALA DE PLANTÃO (POLÍCIA PENAL CE)
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Adicionar colunas de regime e referência de escala na tabela 'perfis' (se não existirem)
ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS regime text DEFAULT '1x3',
ADD COLUMN IF NOT EXISTS data_referencia_plantao text;

-- 2. Tabela de Ausências / Afastamentos (Atestados Médicos, Licenças, Cursos)
CREATE TABLE IF NOT EXISTS public.ausencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policial_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ATESTADO', 'LICENCA_PREMIO', 'LICENCA_MATERNIDADE', 'LICENCA_PATERNIDADE', 'CURSO', 'CESSAO', 'DISPOSICAO', 'OUTROS')),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas por período e policial
CREATE INDEX IF NOT EXISTS idx_ausencias_policial_id ON public.ausencias(policial_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_datas ON public.ausencias(data_inicio, data_fim);

-- 3. Tabela de Configuração Operacional do Plantão (Efetivo Mínimo e Alertas)
CREATE TABLE IF NOT EXISTS public.plantao_config (
    id TEXT PRIMARY KEY DEFAULT 'cfg-plantao-default',
    efetivo_minimo INTEGER NOT NULL DEFAULT 5,
    efetivo_alerta INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão inicial se ainda não existir
INSERT INTO public.plantao_config (id, efetivo_minimo, efetivo_alerta)
VALUES ('cfg-plantao-default', 5, 4)
ON CONFLICT (id) DO NOTHING;

-- 4. Habilitar Row Level Security (RLS) nas novas tabelas
ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantao_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso livre para leitura pública autenticada/anônima do app
CREATE POLICY "Leitura de ausencias permitida" ON public.ausencias
    FOR SELECT USING (true);

CREATE POLICY "Modificacao de ausencias permitida" ON public.ausencias
    FOR ALL USING (true);

CREATE POLICY "Leitura de plantao_config permitida" ON public.plantao_config
    FOR SELECT USING (true);

CREATE POLICY "Modificacao de plantao_config permitida" ON public.plantao_config
    FOR ALL USING (true);

-- 5. Atualizar nome da Equipe 'Charle' para 'Charlie' na tabela equipes (se aplicável)
UPDATE public.equipes 
SET nome = 'Equipe Charlie' 
WHERE nome ILIKE '%Charle%' AND nome NOT ILIKE '%Charlie%';

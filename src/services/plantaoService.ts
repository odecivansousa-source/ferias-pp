// Serviço de Dados para Escala de Plantão — Polícia Penal CE
import { AusenciaPlantao, PlantaoConfig, RegimePlantao } from '../types/plantao';
import { Perfil } from '../types';
import { getSupabaseClient, isSupabaseConnected } from './supabase';
import { getPerfis } from './dataService';

const STORAGE_KEYS = {
  AUSENCIAS: 'ferias_pp_ausencias',
  CONFIG: 'ferias_pp_plantao_config',
  PERFIS: 'ferias_pp_perfis',
};

export const DEFAULT_PLANTAO_CONFIG: PlantaoConfig = {
  id: 'cfg-plantao-default',
  efetivoMinimo: 5,
  efetivoAlerta: 4,
};

// -----------------------------------------------------------------------------
// AUSÊNCIAS (Atestados, Licenças, Cursos)
// -----------------------------------------------------------------------------
export async function getAusencias(): Promise<AusenciaPlantao[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase
        .from('ausencias')
        .select('*')
        .order('data_inicio', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: AusenciaPlantao[] = data.map(d => ({
          id: d.id,
          policialId: d.policial_id,
          tipo: d.tipo,
          dataInicio: d.data_inicio,
          dataFim: d.data_fim,
          observacao: d.observacao || '',
          criadoEm: d.created_at,
        }));
        try {
          localStorage.setItem(STORAGE_KEYS.AUSENCIAS, JSON.stringify(mapped));
        } catch (e) {}
        return mapped;
      }
    } catch (e) {
      console.warn('Erro ao carregar ausências do Supabase, usando armazenamento local:', e);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUSENCIAS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {}

  return [];
}

export async function createAusencia(
  nova: Omit<AusenciaPlantao, 'id' | 'criadoEm'>
): Promise<AusenciaPlantao> {
  const id = 'aus-' + Date.now();
  const criadoEm = new Date().toISOString();

  const item: AusenciaPlantao = {
    ...nova,
    id,
    criadoEm,
  };

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase
        .from('ausencias')
        .insert({
          policial_id: item.policialId,
          tipo: item.tipo,
          data_inicio: item.dataInicio,
          data_fim: item.dataFim,
          observacao: item.observacao || null,
        })
        .select()
        .single();

      if (!error && data) {
        item.id = data.id;
      }
    } catch (e) {
      console.warn('Erro ao salvar ausência no Supabase:', e);
    }
  }

  const list = await getAusencias();
  list.unshift(item);
  try {
    localStorage.setItem(STORAGE_KEYS.AUSENCIAS, JSON.stringify(list));
  } catch (e) {}

  return item;
}

export async function deleteAusencia(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      await supabase.from('ausencias').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao deletar ausência no Supabase:', e);
    }
  }

  try {
    const list = await getAusencias();
    const filtered = list.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.AUSENCIAS, JSON.stringify(filtered));
  } catch (e) {}

  return true;
}

// -----------------------------------------------------------------------------
// CONFIGURAÇÃO DE PLANTÃO (Efetivo Mínimo e Alerta)
// -----------------------------------------------------------------------------
export async function getPlantaoConfig(): Promise<PlantaoConfig> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase
        .from('plantao_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const config: PlantaoConfig = {
          id: data.id,
          efetivoMinimo: data.efetivo_minimo ?? 5,
          efetivoAlerta: data.efetivo_alerta ?? 4,
        };
        try {
          localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
        } catch (e) {}
        return config;
      }
    } catch (e) {
      console.warn('Erro ao carregar config de plantão do Supabase:', e);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.efetivoMinimo === 'number') {
        return parsed;
      }
    }
  } catch (e) {}

  return DEFAULT_PLANTAO_CONFIG;
}

export async function updatePlantaoConfig(config: PlantaoConfig): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      await supabase.from('plantao_config').upsert({
        id: config.id.startsWith('cfg-') ? undefined : config.id,
        efetivo_minimo: config.efetivoMinimo,
        efetivo_alerta: config.efetivoAlerta,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Erro ao atualizar config de plantão no Supabase:', e);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {}
}

// -----------------------------------------------------------------------------
// ATUALIZAÇÃO DO REGIME INDIVIDUAL DO POLICIAL
// -----------------------------------------------------------------------------
export async function updatePerfilRegime(
  perfilId: string,
  regime: RegimePlantao,
  dataReferencia: string,
  matricula?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const isUuid = !!(perfilId && perfilId.length === 36 && perfilId.includes('-'));
      let query = supabase.from('perfis').update({
        regime,
        data_referencia_plantao: dataReferencia,
        updated_at: new Date().toISOString(),
      });

      if (isUuid) {
        query = query.eq('id', perfilId);
      } else if (matricula) {
        query = query.eq('matricula', matricula);
      } else {
        query = query.eq('matricula', perfilId);
      }

      const { error } = await query;
      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
        throw new Error(error.message);
      }
    } catch (e: any) {
      console.warn('Erro ao atualizar regime do perfil no Supabase:', e);
      throw e;
    }
  }

  // Atualizar cache de perfis localmente
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PERFIS);
    if (raw) {
      const perfis = JSON.parse(raw);
      if (Array.isArray(perfis)) {
        const idx = perfis.findIndex((p: any) => p.id === perfilId || (matricula && p.matricula === matricula));
        if (idx >= 0) {
          perfis[idx] = {
            ...perfis[idx],
            regime,
            dataReferenciaPlantao: dataReferencia,
          };
          localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(perfis));
        }
      }
    }
  } catch (e) {}
}

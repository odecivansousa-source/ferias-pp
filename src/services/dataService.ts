import {
  Equipe,
  Perfil,
  SolicitacaoFerias,
  ConfiguracaoFerias,
  HistoricoAuditoria,
} from '../types';
import { getSupabaseClient, isSupabaseConnected } from './supabase';
import { MOCK_EQUIPES, MOCK_CONFIGURACAO, generateMockPoliciais, generateMockSolicitacoes } from './mockData';
import { analisarConflitosSolicitacao } from './conflictEngine';

// Chaves para persistência local em Modo Offline/Demonstração
const STORAGE_KEYS = {
  EQUIPES: 'ferias_pp_equipes',
  PERFIS: 'ferias_pp_perfis',
  SOLICITACOES: 'ferias_pp_solicitacoes',
  CONFIG: 'ferias_pp_configuracao',
  HISTORICO: 'ferias_pp_historico',
  ACTIVE_USER: 'ferias_pp_active_user_id',
};

export const EQUIPE_ID_MAP: Record<string, string> = {
  'eq-1': '11111111-1111-1111-1111-111111111111',
  'eq-2': '22222222-2222-2222-2222-222222222222',
  'eq-3': '33333333-3333-3333-3333-333333333333',
  'eq-4': '44444444-4444-4444-4444-444444444444',
};

export function normalizeEquipeId(id?: string): string {
  if (!id) return '11111111-1111-1111-1111-111111111111';
  if (EQUIPE_ID_MAP[id]) return EQUIPE_ID_MAP[id];
  if (id.length === 36 && id.includes('-')) return id;
  return '11111111-1111-1111-1111-111111111111';
}

export function normalizeUserId(id?: string): string {
  if (!id || id === 'usr-diretor') return '00000000-0000-0000-0000-000000000001';
  if (id.length === 36 && id.includes('-')) return id;
  return '00000000-0000-0000-0000-000000000001';
}

export const DEFAULT_FALLBACK_USER: Perfil = {
  id: '00000000-0000-0000-0000-000000000001',
  matricula: '123',
  nomeCompleto: 'PEDRO',
  equipeId: '11111111-1111-1111-1111-111111111111',
  papel: 'diretor',
  situacao: 'ativo',
  email: 'diretoria@unidade.local',
  telefone: '',
  senha: '131220',
};

// Inicializa o armazenamento local com proteção contra JSON vazio ou corrompido
function initLocalStorageMock() {
  try {
    localStorage.removeItem('ferias_pp_supabase_url');
    localStorage.removeItem('ferias_pp_supabase_key');

    if (!localStorage.getItem('ferias_pp_diretor_senha')) {
      localStorage.setItem('ferias_pp_diretor_senha', '131220');
    }


    // Migration v6: Limpeza forçada de dados para garantir base zerada e sincronizada com Supabase
    if (localStorage.getItem('ferias_pp_clean_slate_v6') !== 'true') {
      localStorage.removeItem(STORAGE_KEYS.PERFIS);
      localStorage.removeItem(STORAGE_KEYS.SOLICITACOES);
      localStorage.removeItem(STORAGE_KEYS.HISTORICO);
      localStorage.removeItem('ferias_pp_logged_matricula');
      localStorage.setItem('ferias_pp_diretor_senha', '131220');
      localStorage.setItem('ferias_pp_clean_slate_v6', 'true');
    }
  } catch (e) {}

  try {
    if (localStorage.getItem('ferias_pp_equipes_v4') !== 'true') {
      localStorage.setItem(STORAGE_KEYS.EQUIPES, JSON.stringify(MOCK_EQUIPES));
      localStorage.setItem('ferias_pp_equipes_v4', 'true');
    }
  } catch (e) {
    localStorage.setItem(STORAGE_KEYS.EQUIPES, JSON.stringify(MOCK_EQUIPES));
  }

  try {
    const rawConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!rawConfig) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(MOCK_CONFIGURACAO));
    }
  } catch (e) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(MOCK_CONFIGURACAO));
  }

  try {
    const rawPerfis = localStorage.getItem(STORAGE_KEYS.PERFIS);
    const parsedPerfis = rawPerfis ? JSON.parse(rawPerfis) : null;
    if (!Array.isArray(parsedPerfis) || parsedPerfis.length === 0) {
      const mockPerfis = generateMockPoliciais();
      localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(mockPerfis));
      localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify([]));
    }
  } catch (e) {
    const mockPerfis = generateMockPoliciais();
    localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(mockPerfis));
    localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify([]));
  }
}

// Reset completo dos dados para início limpo no Supabase e no aparelho
export async function resetDemoData(): Promise<void> {
  localStorage.removeItem(STORAGE_KEYS.EQUIPES);
  localStorage.removeItem(STORAGE_KEYS.PERFIS);
  localStorage.removeItem(STORAGE_KEYS.SOLICITACOES);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.HISTORICO);
  localStorage.removeItem('ferias_pp_logged_matricula');
  localStorage.setItem('ferias_pp_diretor_senha', '131220');
  localStorage.setItem('ferias_pp_clean_slate_v6', 'true');
  initLocalStorageMock();

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      await supabase.from('periodos_ferias').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('historico_decisoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('solicitacoes_ferias').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('perfis').delete().neq('papel', 'diretor');
    } catch (e) {
      console.warn('Erro ao limpar Supabase no reset:', e);
    }
  }
}

// -----------------------------------------------------------------------------
// EQUIPES
// -----------------------------------------------------------------------------
export async function getEquipes(): Promise<Equipe[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase.from('equipes').select('*').order('codigo');
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map(d => ({
          id: d.id,
          nome: d.nome,
          codigo: d.codigo,
          limiteAfastamentosSimultaneos: d.limite_afastamentos_simultaneos,
          efetivoMinimoRequerido: d.efetivo_minimo_requerido,
          ativa: d.ativa,
        }));
        try {
          localStorage.setItem(STORAGE_KEYS.EQUIPES, JSON.stringify(mapped));
        } catch (e) {}
        return mapped;
      }
    } catch (e) {
      console.warn('Erro ao carregar equipes do Supabase, usando armazenamento local:', e);
    }
  }

  initLocalStorageMock();
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPES) || '[]');
    if (Array.isArray(list) && list.length > 0) return list;
  } catch(e) {}
  return MOCK_EQUIPES;
}

export async function updateEquipe(equipe: Equipe): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { error } = await supabase.from('equipes').update({
        nome: equipe.nome,
        codigo: equipe.codigo,
        limite_afastamentos_simultaneos: equipe.limiteAfastamentosSimultaneos,
        efetivo_minimo_requerido: equipe.efetivoMinimoRequerido,
        ativa: equipe.ativa,
        updated_at: new Date().toISOString(),
      }).eq('id', equipe.id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Erro ao atualizar equipe no Supabase, salvando localmente:', e);
    }
  }

  const equipes = await getEquipes();
  const idx = equipes.findIndex(e => e.id === equipe.id);
  if (idx >= 0) {
    equipes[idx] = equipe;
    localStorage.setItem(STORAGE_KEYS.EQUIPES, JSON.stringify(equipes));
  }
}

// -----------------------------------------------------------------------------
// CONFIGURAÇÕES GERAIS DE FÉRIAS
// -----------------------------------------------------------------------------
export async function getConfiguracao(): Promise<ConfiguracaoFerias> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase.from('configuracoes_ferias').select('*').limit(1).single();
      if (!error && data) {
        return {
          id: data.id,
          anoExercicio: data.ano_exercicio,
          aberturaSolicitacoes: data.abertura_solicitacoes,
          fechamentoSolicitacoes: data.fechamento_solicitacoes,
          antecedenciaMinimaDias: data.antecedencia_minima_dias,
          permitirFracionamento: data.permitir_fracionamento,
          bloqueioGeralAtivo: data.bloqueio_geral_ativo,
          mensagemAviso: data.mensagem_aviso,
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar config do Supabase:', e);
    }
  }

  initLocalStorageMock();
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.anoExercicio) return parsed;
    }
  } catch(e) {}
  return MOCK_CONFIGURACAO;
}

export async function updateConfiguracao(config: ConfiguracaoFerias): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { error } = await supabase.from('configuracoes_ferias').upsert({
        id: config.id.startsWith('cfg-') ? undefined : config.id,
        ano_exercicio: config.anoExercicio,
        abertura_solicitacoes: config.aberturaSolicitacoes,
        fechamento_solicitacoes: config.fechamentoSolicitacoes,
        antecedencia_minima_dias: config.antecedenciaMinimaDias,
        permitir_fracionamento: config.permitirFracionamento,
        bloqueio_geral_ativo: config.bloqueioGeralAtivo,
        mensagem_aviso: config.mensagemAviso,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Erro ao atualizar config no Supabase:', e);
    }
  }

  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

// -----------------------------------------------------------------------------
// PERFIS DE POLICIAIS
// -----------------------------------------------------------------------------
export async function getPerfis(): Promise<Perfil[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase.from('perfis').select('*').order('nome_completo');
      if (!error && Array.isArray(data) && data.length > 0) {
        const perfisFormatados: Perfil[] = data.map(d => ({
          id: d.id,
          authUserId: d.auth_user_id,
          matricula: d.matricula,
          nomeCompleto: d.nome_completo,
          equipeId: normalizeEquipeId(d.equipe_id),
          papel: d.papel,
          situacao: d.situacao,
          email: d.email,
          telefone: d.telefone,
          senha: d.senha || (d.papel === 'diretor' || d.papel === 'admin' ? getDiretorSenha() : undefined),
        }));
        localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(perfisFormatados));
        return perfisFormatados;
      }
    } catch (e) {
      console.warn('Erro ao carregar perfis do Supabase:', e);
    }
  }

  initLocalStorageMock();
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERFIS) || '[]');
    if (Array.isArray(list) && list.length > 0) {
      return list.map((p: any) => ({
        ...p,
        papel: p.papel === 'admin' ? 'diretor' : p.papel,
        senha: p.senha || (p.papel === 'diretor' || p.papel === 'admin' ? getDiretorSenha() : undefined),
      }));
    }
  } catch(e) {}
  return generateMockPoliciais();
}

export async function savePerfil(perfil: Perfil): Promise<Perfil> {
  const normalizedEquipeId = normalizeEquipeId(perfil.equipeId);
  const perfilNormalized: Perfil = {
    ...perfil,
    matricula: perfil.matricula.trim().toUpperCase(),
    nomeCompleto: perfil.nomeCompleto.trim(),
    equipeId: normalizedEquipeId,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const isDirector = perfilNormalized.papel === 'diretor' || (perfilNormalized.papel as string) === 'admin';
    const mat = perfilNormalized.matricula;
    const isUuid = !!(perfilNormalized.id && perfilNormalized.id.length === 36 && perfilNormalized.id.includes('-'));

    // 1. Procurar registro existente no Supabase:
    // a) Por matrícula
    const { data: existingByMat } = await supabase
      .from('perfis')
      .select('id, matricula, papel, senha')
      .ilike('matricula', mat)
      .maybeSingle();

    // b) Por ID (se UUID válido)
    let existingById: any = null;
    if (isUuid) {
      const { data: byId } = await supabase
        .from('perfis')
        .select('id, matricula, papel, senha')
        .eq('id', perfilNormalized.id)
        .maybeSingle();
      existingById = byId;
    }

    // c) Se for diretor, procurar diretor existente no Supabase
    let existingDirector: any = null;
    if (isDirector) {
      const { data: dir } = await supabase
        .from('perfis')
        .select('id, matricula, papel, senha')
        .or('papel.eq.diretor,id.eq.00000000-0000-0000-0000-000000000001')
        .limit(1)
        .maybeSingle();
      existingDirector = dir;
    }

    const payload: any = {
      matricula: mat,
      nome_completo: perfilNormalized.nomeCompleto,
      equipe_id: normalizedEquipeId,
      papel: perfilNormalized.papel,
      situacao: perfilNormalized.situacao,
      email: perfilNormalized.email || null,
      telefone: perfilNormalized.telefone || null,
      updated_at: new Date().toISOString(),
    };

    if (isDirector) {
      payload.senha = perfilNormalized.senha || existingByMat?.senha || existingById?.senha || existingDirector?.senha || getDiretorSenha();
    } else {
      payload.senha = null;
    }

    let targetDbId: string | null = null;
    if (existingByMat) {
      targetDbId = existingByMat.id;
      // Se este perfil está se tornando Diretor e havia um diretor padrão (123456) separado, remove o diretor padrão antigo
      if (isDirector && existingDirector && existingDirector.id !== existingByMat.id && existingDirector.matricula !== mat) {
        await supabase.from('perfis').delete().eq('id', existingDirector.id);
      }
    } else if (existingById) {
      targetDbId = existingById.id;
    } else if (isDirector && existingDirector) {
      targetDbId = existingDirector.id;
    }

    let res: any;
    if (targetDbId) {
      res = await supabase.from('perfis').update(payload).eq('id', targetDbId).select().single();
      perfilNormalized.id = targetDbId;
    } else {
      if (isUuid) {
        payload.id = perfilNormalized.id;
      }
      res = await supabase.from('perfis').insert(payload).select().single();
      if (res.data?.id) {
        perfilNormalized.id = res.data.id;
      }
    }

    if (res.error) {
      console.error('Erro ao salvar perfil no Supabase:', res.error);
      throw new Error(`Falha ao salvar perfil: ${res.error.message}`);
    }
  }

  // Atualiza cache local garantindo sincronia perfeita com Supabase
  const perfis = await getPerfis();
  const idx = perfis.findIndex(p => p.id === perfilNormalized.id || p.matricula === perfilNormalized.matricula);
  if (idx >= 0) {
    perfis[idx] = perfilNormalized;
  } else {
    perfis.push(perfilNormalized);
  }
  localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(perfis));

  return perfilNormalized;
}

export async function deletePerfil(id: string, matricula?: string): Promise<boolean> {
  const perfis = await getPerfis();
  const target = perfis.find(p => p.id === id || (matricula && p.matricula === matricula));
  const mat = (matricula || target?.matricula || '').trim().toUpperCase();

  const supabase = getSupabaseClient();
  if (supabase && mat) {
    const resMat = await supabase.from('perfis').delete().eq('matricula', mat);
    if (resMat.error) {
      console.error('Erro ao deletar perfil no Supabase:', resMat.error);
      throw new Error(`Falha ao excluir perfil: ${resMat.error.message}`);
    }
  }

  const filtered = perfis.filter(p => (!mat || p.matricula !== mat) && p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(filtered));

  return true;
}

// -----------------------------------------------------------------------------
// SOLICITAÇÕES DE FÉRIAS
// -----------------------------------------------------------------------------
export async function getSolicitacoes(anoExercicio?: number): Promise<SolicitacaoFerias[]> {
  initLocalStorageMock();
  const perfis = await getPerfis();
  const equipes = await getEquipes();
  const perfisMap = new Map(perfis.map(p => [p.id, p]));
  const equipesMap = new Map(equipes.map(e => [e.id, e]));

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      let query = supabase.from('solicitacoes_ferias').select('*, periodos_ferias(*)').order('created_at', { ascending: false });
      if (anoExercicio) {
        query = query.eq('ano_exercicio', anoExercicio);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const mapped = data.map(d => {
          const pol = perfisMap.get(d.policial_id);
          const eq = equipesMap.get(d.equipe_id);
          const periodos = (d.periodos_ferias || []).map((p: any) => ({
            id: p.id,
            solicitacaoId: p.solicitacao_id,
            numeroPeriodo: p.numero_periodo,
            dataInicio: p.data_inicio,
            dataFim: p.data_fim,
            quantidadeDias: p.quantidade_dias,
          })).sort((a: any, b: any) => a.numeroPeriodo - b.numeroPeriodo);

          return {
            id: d.id,
            policialId: d.policial_id,
            equipeId: d.equipe_id,
            anoExercicio: d.ano_exercicio,
            modalidade: d.modalidade,
            status: d.status,
            observacaoPolicial: d.observacao_policial,
            justificativaDecisao: d.justificativa_decisao,
            decididaPor: d.decidida_por,
            decididaEm: d.decidida_em,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
            periodos,
            policial: pol,
            equipe: eq,
          };
        });
        localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.warn('Erro ao carregar solicitações do Supabase, usando local:', e);
    }
  }

  // Fallback LocalStorage seguro (base limpa)
  let list: SolicitacaoFerias[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SOLICITACOES);
    if (raw) list = JSON.parse(raw);
  } catch (e) {}

  if (!Array.isArray(list)) {
    list = [];
    localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(list));
  }

  // Enriquece com dados de policial e equipe
  const enriched = list.map(s => ({
    ...s,
    periodos: Array.isArray(s.periodos) ? s.periodos : [],
    policial: perfisMap.get(s.policialId) || perfis[0],
    equipe: equipesMap.get(s.equipeId) || equipes[0],
  }));

  if (anoExercicio) {
    return enriched.filter(s => s.anoExercicio === anoExercicio);
  }
  return enriched;
}

export async function createSolicitacao(
  nova: Omit<SolicitacaoFerias, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SolicitacaoFerias> {
  const id = 'sol-' + Date.now();
  const now = new Date().toISOString();
  const normalizedPolicialId = normalizeUserId(nova.policialId);
  const normalizedEquipeId = normalizeEquipeId(nova.equipeId);

  const full: SolicitacaoFerias = {
    ...nova,
    policialId: normalizedPolicialId,
    equipeId: normalizedEquipeId,
    id,
    createdAt: now,
    updatedAt: now,
    periodos: nova.periodos.map((p, idx) => ({
      ...p,
      id: `per-${id}-${idx + 1}`,
      solicitacaoId: id,
    })),
  };

  // Sincroniza com Supabase se conectado
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data: solData, error: solErr } = await supabase
        .from('solicitacoes_ferias')
        .insert({
          policial_id: normalizedPolicialId,
          equipe_id: normalizedEquipeId,
          ano_exercicio: full.anoExercicio,
          modalidade: full.modalidade,
          status: full.status,
          observacao_policial: full.observacaoPolicial,
        })
        .select()
        .single();

      if (!solErr && solData) {
        full.id = solData.id;
        const periodosPayload = full.periodos.map(p => ({
          solicitacao_id: solData.id,
          numero_periodo: p.numeroPeriodo,
          data_inicio: p.dataInicio,
          data_fim: p.dataFim,
          quantidade_dias: p.quantidadeDias,
        }));
        await supabase.from('periodos_ferias').insert(periodosPayload);
      } else if (solErr) {
        console.warn('Erro ao inserir solicitacao no Supabase:', solErr);
      }
    } catch (e) {
      console.warn('Erro ao inserir no Supabase:', e);
    }
  }

  const solicitacoes = await getSolicitacoes();
  solicitacoes.unshift(full);
  localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));

  return full;
}

// -----------------------------------------------------------------------------
// APROVAÇÃO TRANSACIONAL ANTI-CONCORRÊNCIA
// -----------------------------------------------------------------------------
export async function aprovarSolicitacaoTransacional(
  solicitacaoId: string,
  decididaPorId: string,
  justificativa: string = 'Aprovada pela Direção'
): Promise<{ sucesso: boolean; mensagem: string }> {
  const supabase = getSupabaseClient();
  const normalizedDecididaPor = normalizeUserId(decididaPorId);

  // Se Supabase estiver conectado, executa a Stored Procedure transacional no banco
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase.rpc('fn_aprovar_solicitacao', {
        p_solicitacao_id: solicitacaoId,
        p_decidida_por: normalizedDecididaPor,
        p_justificativa: justificativa,
      });

      if (error) {
        return { sucesso: false, mensagem: `Erro no Supabase: ${error.message}` };
      }

      if (data && typeof data === 'object') {
        return { sucesso: data.sucesso, mensagem: data.mensagem };
      }
    } catch (e: any) {
      console.warn('Erro ao chamar RPC do Supabase, fallback para validação local:', e);
    }
  }

  // Validação Local Robusta (Modo Demonstração / Offline)
  const solicitacoes = await getSolicitacoes();
  const target = solicitacoes.find(s => s.id === solicitacaoId);
  if (!target) {
    return { sucesso: false, mensagem: 'Solicitação não encontrada.' };
  }

  const equipes = await getEquipes();
  const equipe = equipes.find(e => e.id === target.equipeId);
  if (!equipe) {
    return { sucesso: false, mensagem: 'Equipe da solicitação não encontrada.' };
  }

  // Análise estrita de conflitos
  const analise = analisarConflitosSolicitacao(equipe, target.periodos, solicitacoes, solicitacaoId, target.policialId);
  if (analise.temConflito) {
    return {
      sucesso: false,
      mensagem: `Aprovação bloqueada: ${analise.mensagem}`,
    };
  }

  // Se passou sem conflitos, aprova e grava histórico
  target.status = 'APROVADA';
  target.decididaPor = normalizedDecididaPor;
  target.decididaEm = new Date().toISOString();
  target.justificativaDecisao = justificativa;
  target.updatedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));

  // Registrar auditoria
  const perfis = await getPerfis();
  const responsavel = perfis.find(p => p.id === normalizedDecididaPor);
  await addHistoricoAuditoria({
    id: 'hist-' + Date.now(),
    solicitacaoId,
    responsavelId: normalizedDecididaPor,
    responsavelNome: responsavel?.nomeCompleto || 'Diretoria',
    acao: 'APROVACAO',
    novoStatus: 'APROVADA',
    statusAnterior: 'PENDENTE',
    justificativa,
    createdAt: new Date().toISOString(),
  });

  return { sucesso: true, mensagem: 'Solicitação de férias aprovada com sucesso!' };
}

// Devolver para correção ou rejeitar
export async function decidirSolicitacao(
  solicitacaoId: string,
  decididaPorId: string,
  novoStatus: 'DEVOLVIDA' | 'REJEITADA' | 'CANCELADA',
  justificativa: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  const supabase = getSupabaseClient();
  const normalizedDecididaPor = normalizeUserId(decididaPorId);

  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase.rpc('fn_decidir_solicitacao', {
        p_solicitacao_id: solicitacaoId,
        p_decidida_por: normalizedDecididaPor,
        p_novo_status: novoStatus,
        p_justificativa: justificativa,
      });
      if (!error && data) {
        return { sucesso: data.sucesso, mensagem: data.mensagem };
      }
    } catch (e) {
      console.warn('Erro ao chamar RPC fn_decidir_solicitacao:', e);
    }
  }

  // Local update
  const solicitacoes = await getSolicitacoes();
  const target = solicitacoes.find(s => s.id === solicitacaoId);
  if (!target) {
    return { sucesso: false, mensagem: 'Solicitação não encontrada.' };
  }

  const statusAnterior = target.status;
  target.status = novoStatus;
  target.decididaPor = normalizedDecididaPor;
  target.decididaEm = new Date().toISOString();
  target.justificativaDecisao = justificativa;
  target.updatedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));

  const perfis = await getPerfis();
  const responsavel = perfis.find(p => p.id === normalizedDecididaPor);
  await addHistoricoAuditoria({
    id: 'hist-' + Date.now(),
    solicitacaoId,
    responsavelId: normalizedDecididaPor,
    responsavelNome: responsavel?.nomeCompleto || 'Diretoria',
    acao: novoStatus,
    novoStatus,
    statusAnterior,
    justificativa,
    createdAt: new Date().toISOString(),
  });

  return { sucesso: true, mensagem: `Solicitação atualizada para ${novoStatus} com sucesso!` };
}

// -----------------------------------------------------------------------------
// AUDITORIA
// -----------------------------------------------------------------------------
export async function getHistoricoAuditoria(solicitacaoId?: string): Promise<HistoricoAuditoria[]> {
  initLocalStorageMock();
  const raw = localStorage.getItem(STORAGE_KEYS.HISTORICO) || '[]';
  const list: HistoricoAuditoria[] = JSON.parse(raw);

  if (solicitacaoId) {
    return list.filter(h => h.solicitacaoId === solicitacaoId);
  }
  return list;
}

export async function addHistoricoAuditoria(item: HistoricoAuditoria): Promise<void> {
  const list = await getHistoricoAuditoria();
  list.unshift(item);
  localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(list));
}

// Usuário Ativo Atual (Simulador de Login / Troca de Perfil)
export function getActiveUserId(): string {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER) || '00000000-0000-0000-0000-000000000001';
}

export function setActiveUserId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, id);
}

// -----------------------------------------------------------------------------
// GESTÃO DE ACESSO EXCLUSIVO DO DIRETOR DA UNIDADE
// -----------------------------------------------------------------------------
export function getDiretorSenha(): string {
  try {
    return localStorage.getItem('ferias_pp_diretor_senha') || '131220';
  } catch (e) {
    return '131220';
  }
}

export async function salvarDadosDiretor(nomeCompleto: string, matricula: string, novaSenha?: string): Promise<Perfil> {
  const perfis = await getPerfis();
  let diretor = perfis.find(p => p.papel === 'diretor' || (p.papel as string) === 'admin');
  const senhaAtual = getDiretorSenha();
  const senhaFinal = novaSenha && novaSenha.trim() ? novaSenha.trim() : senhaAtual;

  try {
    localStorage.setItem('ferias_pp_diretor_senha', senhaFinal);
  } catch (e) {}

  const diretorToSave: Perfil = {
    id: diretor?.id || '00000000-0000-0000-0000-000000000001',
    nomeCompleto: nomeCompleto.trim(),
    matricula: matricula.trim().toUpperCase(),
    equipeId: diretor?.equipeId || '11111111-1111-1111-1111-111111111111',
    papel: 'diretor',
    situacao: 'ativo',
    email: diretor?.email || 'diretoria@unidade.local',
    telefone: diretor?.telefone || '',
    senha: senhaFinal,
  };

  const saved = await savePerfil(diretorToSave);

  try {
    localStorage.setItem('ferias_pp_logged_matricula', saved.matricula);
  } catch (e) {}

  return saved;
}

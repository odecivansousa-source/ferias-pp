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

export const DEFAULT_FALLBACK_USER: Perfil = {
  id: 'usr-admin',
  matricula: 'ADM-99001',
  nomeCompleto: 'Gestor Administrativo Costa [DEMO]',
  equipeId: 'eq-1',
  papel: 'admin',
  situacao: 'ativo',
  email: 'admin.teste@unidade.sap.sp.gov.br',
  telefone: '(11) 98000-0001',
};

// Inicializa o armazenamento local com proteção contra JSON vazio ou corrompido
function initLocalStorageMock() {
  try {
    const rawEquipes = localStorage.getItem(STORAGE_KEYS.EQUIPES);
    const parsedEquipes = rawEquipes ? JSON.parse(rawEquipes) : null;
    if (!Array.isArray(parsedEquipes) || parsedEquipes.length === 0) {
      localStorage.setItem(STORAGE_KEYS.EQUIPES, JSON.stringify(MOCK_EQUIPES));
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

      const { solicitacoes, historico } = generateMockSolicitacoes(mockPerfis);
      localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));
      localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(historico));
    }
  } catch (e) {
    const mockPerfis = generateMockPoliciais();
    localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(mockPerfis));

    const { solicitacoes, historico } = generateMockSolicitacoes(mockPerfis);
    localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));
    localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(historico));
  }
}

// Reset completo dos dados locais de demonstração
export function resetDemoData(): void {
  localStorage.removeItem(STORAGE_KEYS.EQUIPES);
  localStorage.removeItem(STORAGE_KEYS.PERFIS);
  localStorage.removeItem(STORAGE_KEYS.SOLICITACOES);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.HISTORICO);
  initLocalStorageMock();
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
        return data.map(d => ({
          id: d.id,
          nome: d.nome,
          codigo: d.codigo,
          limiteAfastamentosSimultaneos: d.limite_afastamentos_simultaneos,
          efetivoMinimoRequerido: d.efetivo_minimo_requerido,
          ativa: d.ativa,
        }));
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
      if (!error && data && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          authUserId: d.auth_user_id,
          matricula: d.matricula,
          nomeCompleto: d.nome_completo,
          equipeId: d.equipe_id,
          papel: d.papel,
          situacao: d.situacao,
          email: d.email,
          telefone: d.telefone,
        }));
      }
    } catch (e) {
      console.warn('Erro ao carregar perfis do Supabase:', e);
    }
  }

  initLocalStorageMock();
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERFIS) || '[]');
    if (Array.isArray(list) && list.length > 0) return list;
  } catch(e) {}
  return generateMockPoliciais();
}

export async function savePerfil(perfil: Perfil): Promise<Perfil> {
  const perfis = await getPerfis();
  const idx = perfis.findIndex(p => p.id === perfil.id);
  if (idx >= 0) {
    perfis[idx] = perfil;
  } else {
    perfis.push(perfil);
  }
  localStorage.setItem(STORAGE_KEYS.PERFIS, JSON.stringify(perfis));

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      await supabase.from('perfis').upsert({
        id: perfil.id.startsWith('pol-') || perfil.id.startsWith('usr-') ? undefined : perfil.id,
        matricula: perfil.matricula,
        nome_completo: perfil.nomeCompleto,
        equipe_id: perfil.equipeId,
        papel: perfil.papel,
        situacao: perfil.situacao,
        email: perfil.email,
        telefone: perfil.telefone,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Erro ao persistir perfil no Supabase:', e);
    }
  }

  return perfil;
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
      if (!error && data && data.length > 0) {
        return data.map(d => {
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
      }
    } catch (e) {
      console.warn('Erro ao carregar solicitações do Supabase, usando local:', e);
    }
  }

  // Fallback LocalStorage seguro
  let list: SolicitacaoFerias[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SOLICITACOES);
    if (raw) list = JSON.parse(raw);
  } catch (e) {}

  if (!Array.isArray(list) || list.length === 0) {
    list = generateMockSolicitacoes(perfis).solicitacoes;
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

  const full: SolicitacaoFerias = {
    ...nova,
    id,
    createdAt: now,
    updatedAt: now,
    periodos: nova.periodos.map((p, idx) => ({
      ...p,
      id: `per-${id}-${idx + 1}`,
      solicitacaoId: id,
    })),
  };

  const solicitacoes = await getSolicitacoes();
  solicitacoes.unshift(full);
  localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));

  // Tenta sincronizar com Supabase se conectado
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConnected()) {
    try {
      const { data: solData, error: solErr } = await supabase
        .from('solicitacoes_ferias')
        .insert({
          policial_id: full.policialId,
          equipe_id: full.equipeId,
          ano_exercicio: full.anoExercicio,
          modalidade: full.modalidade,
          status: full.status,
          observacao_policial: full.observacaoPolicial,
        })
        .select()
        .single();

      if (!solErr && solData) {
        const periodosPayload = full.periodos.map(p => ({
          solicitacao_id: solData.id,
          numero_periodo: p.numeroPeriodo,
          data_inicio: p.dataInicio,
          data_fim: p.dataFim,
          quantidade_dias: p.quantidadeDias,
        }));
        await supabase.from('periodos_ferias').insert(periodosPayload);
      }
    } catch (e) {
      console.warn('Erro ao inserir no Supabase:', e);
    }
  }

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

  // Se Supabase estiver conectado, executa a Stored Procedure transacional no banco
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase.rpc('fn_aprovar_solicitacao', {
        p_solicitacao_id: solicitacaoId,
        p_decidida_por: decididaPorId,
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
  const analise = analisarConflitosSolicitacao(equipe, target.periodos, solicitacoes, solicitacaoId);
  if (analise.temConflito) {
    return {
      sucesso: false,
      mensagem: `Aprovação bloqueada: ${analise.mensagem}`,
    };
  }

  // Se passou sem conflitos, aprova e grava histórico
  target.status = 'APROVADA';
  target.decididaPor = decididaPorId;
  target.decididaEm = new Date().toISOString();
  target.justificativaDecisao = justificativa;
  target.updatedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));

  // Registrar auditoria
  const perfis = await getPerfis();
  const responsavel = perfis.find(p => p.id === decididaPorId);
  await addHistoricoAuditoria({
    id: 'hist-' + Date.now(),
    solicitacaoId,
    responsavelId: decididaPorId,
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
  if (supabase && isSupabaseConnected()) {
    try {
      const { data, error } = await supabase.rpc('fn_decidir_solicitacao', {
        p_solicitacao_id: solicitacaoId,
        p_decidida_por: decididaPorId,
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
  target.decididaPor = decididaPorId;
  target.decididaEm = new Date().toISOString();
  target.justificativaDecisao = justificativa;
  target.updatedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEYS.SOLICITACOES, JSON.stringify(solicitacoes));

  const perfis = await getPerfis();
  const responsavel = perfis.find(p => p.id === decididaPorId);
  await addHistoricoAuditoria({
    id: 'hist-' + Date.now(),
    solicitacaoId,
    responsavelId: decididaPorId,
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
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER) || 'usr-admin';
}

export function setActiveUserId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, id);
}

import { Equipe, Perfil, SolicitacaoFerias, ConfiguracaoFerias, HistoricoAuditoria } from '../types';

export const MOCK_EQUIPES: Equipe[] = [
  {
    id: 'eq-1',
    nome: 'Equipe 1 (Plantão Alfa)',
    codigo: 'EQ-01',
    limiteAfastamentosSimultaneos: 3,
    efetivoMinimoRequerido: 22,
    ativa: true,
  },
  {
    id: 'eq-2',
    nome: 'Equipe 2 (Plantão Bravo)',
    codigo: 'EQ-02',
    limiteAfastamentosSimultaneos: 3,
    efetivoMinimoRequerido: 22,
    ativa: true,
  },
  {
    id: 'eq-3',
    nome: 'Equipe 3 (Plantão Charlie)',
    codigo: 'EQ-03',
    limiteAfastamentosSimultaneos: 3,
    efetivoMinimoRequerido: 22,
    ativa: true,
  },
  {
    id: 'eq-4',
    nome: 'Equipe 4 (Plantão Delta)',
    codigo: 'EQ-04',
    limiteAfastamentosSimultaneos: 3,
    efetivoMinimoRequerido: 22,
    ativa: true,
  },
];

export const MOCK_CONFIGURACAO: ConfiguracaoFerias = {
  id: 'cfg-2026',
  anoExercicio: 2026,
  aberturaSolicitacoes: '2026-01-01',
  fechamentoSolicitacoes: '2026-12-31',
  antecedenciaMinimaDias: 30,
  permitirFracionamento: true,
  bloqueioGeralAtivo: false,
  mensagemAviso: 'Período oficial de submissão do plano de férias anual aberto pela Direção da Unidade.',
};

// Perfil inicial do Diretor da Unidade (Matrícula inicial 123456)
export const INITIAL_DIRECTOR_PROFILE: Perfil = {
  id: 'usr-diretor',
  matricula: '123456',
  nomeCompleto: 'Diretor da Unidade',
  equipeId: 'eq-1',
  papel: 'diretor',
  situacao: 'ativo',
  email: 'diretoria@unidade.local',
  telefone: '',
  senha: '131220', // Senha inicial solicitada pelo usuário
};

// Retorna apenas a conta do Diretor da Unidade para início limpo dos cadastros
export function generateMockPoliciais(): Perfil[] {
  return [INITIAL_DIRECTOR_PROFILE];
}

// Inicializa a base de solicitações e histórico totalmente vazia
export function generateMockSolicitacoes(_perfis: Perfil[]): { solicitacoes: SolicitacaoFerias[]; historico: HistoricoAuditoria[] } {
  return { solicitacoes: [], historico: [] };
}

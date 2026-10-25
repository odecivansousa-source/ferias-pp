// Tipos do Domínio FÉRIAS PP

export type PapelUsuario = 'policial' | 'diretor' | 'admin';

export type SituacaoFuncional = 'ativo' | 'inativo';

export type ModalidadeFerias = '30_DIAS' | '2x15_DIAS' | '3x10_DIAS';

export type StatusSolicitacao = 
  | 'RASCUNHO'
  | 'PENDENTE'
  | 'DEVOLVIDA'
  | 'APROVADA'
  | 'REJEITADA'
  | 'CANCELADA';

export interface Equipe {
  id: string;
  nome: string;
  codigo: string;
  limiteAfastamentosSimultaneos: number;
  efetivoMinimoRequerido: number;
  ativa: boolean;
}

export interface Perfil {
  id: string;
  authUserId?: string;
  matricula: string;
  nomeCompleto: string;
  equipeId: string;
  papel: PapelUsuario;
  situacao: SituacaoFuncional;
  email?: string;
  telefone?: string;
}

export interface PeriodoFerias {
  id: string;
  solicitacaoId?: string;
  numeroPeriodo: number; // 1, 2 ou 3
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  quantidadeDias: number;
}

export interface SolicitacaoFerias {
  id: string;
  policialId: string;
  equipeId: string;
  anoExercicio: number;
  modalidade: ModalidadeFerias;
  status: StatusSolicitacao;
  observacaoPolicial?: string;
  justificativaDecisao?: string;
  decididaPor?: string;
  decididaEm?: string;
  createdAt: string;
  updatedAt: string;
  periodos: PeriodoFerias[];
  // Dados populados para exibição
  policial?: Perfil;
  equipe?: Equipe;
}

export interface ConfiguracaoFerias {
  id: string;
  anoExercicio: number;
  aberturaSolicitacoes: string;
  fechamentoSolicitacoes: string;
  antecedenciaMinimaDias: number;
  permitirFracionamento: boolean;
  bloqueioGeralAtivo: boolean;
  mensagemAviso?: string;
}

export interface HistoricoAuditoria {
  id: string;
  solicitacaoId: string;
  responsavelId: string;
  responsavelNome?: string;
  acao: string;
  statusAnterior?: StatusSolicitacao;
  novoStatus: StatusSolicitacao;
  justificativa?: string;
  createdAt: string;
}

export interface ConflitoDia {
  data: string; // YYYY-MM-DD
  totalAfastados: number;
  limiteEquipe: number;
  equipeId: string;
  equipeNome: string;
  temConflito: boolean;
  policiaisAfastados: {
    nome: string;
    matricula: string;
    status: StatusSolicitacao;
  }[];
}

export interface EstatisticasGerais {
  totalPoliciais: number;
  porEquipe: Record<string, number>;
  solicitacoesPendentes: number;
  solicitacoesAprovadas: number;
  solicitacoesRejeitadas: number;
  solicitacoesDevolvidas: number;
  totalAfastadosHoje: number;
  diasComConflitoAno: number;
}

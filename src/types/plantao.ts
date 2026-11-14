// Tipos do Módulo de Escala de Plantão — Polícia Penal CE

export type RegimePlantao = '1x3' | '2x6' | '3x9';

export type TipoAusencia =
  | 'ATESTADO'
  | 'LICENCA_PREMIO'
  | 'LICENCA_MATERNIDADE'
  | 'LICENCA_PATERNIDADE'
  | 'CURSO'
  | 'CESSAO'
  | 'DISPOSICAO'
  | 'OUTROS';

export interface AusenciaPlantao {
  id: string;
  policialId: string;
  tipo: TipoAusencia;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  observacao?: string;
  criadoEm?: string;
}

export interface PlantaoConfig {
  id: string;
  efetivoMinimo: number; // Mínimo aceitável (padrão: 5)
  efetivoAlerta: number; // Nível de alerta crítico (padrão: 4)
}

export interface PolicialPlantao {
  id: string;
  nome: string;
  matricula: string;
  equipeId: string;
  regime?: RegimePlantao;
  dataReferencia?: string;
  escalado: boolean; // Se pela escala ciclica é dia de trabalho
  ausente: boolean; // Se está em férias, atestado, licença, etc.
  motivoAusencia?: string; // 'FÉRIAS', 'ATESTADO', 'LICENÇA', etc.
  presente: boolean; // escalado && !ausente
  isDiretor?: boolean; // Se é o Diretor em expediente comercial
  isRemanejado?: boolean; // Se veio remanejado de outra equipe de folga
  equipeOrigemNome?: string; // Nome da equipe de origem do policial remanejado
  motivoRemanejamento?: string;
}

export interface PlantaoEquipeDiario {
  equipeId: string;
  equipeNome: string;
  equipeCodigo: string;
  totalPoliciasEquipe: number;
  totalEscalados: number; // Quantos policiais desta equipe deveriam trabalhar hoje
  totalAusentes: number;
  totalRemanejados: number; // Policiais remanejados de outra equipe para cá // Quantos escalados estão ausentes
  efetivoReal: number; // Efetivo operacional 24h
  efetivoDiurno: number; // Efetivo total durante o dia (conta Diretor de seg a sex)
  diretorPresenteDiurno: boolean; // Se o Diretor está presente na unidade neste dia (Seg a Sex)
  status: 'OK' | 'ALERTA' | 'CRITICO';
  policiais: PolicialPlantao[];
}

export const REGIME_LABELS: Record<RegimePlantao, string> = {
  '1x3': '1×3 (24h de plantão + 72h folga)',
  '2x6': '2×6 (48h de plantão + 6 dias folga)',
  '3x9': '3×9 (72h de plantão + 9 dias folga)',
};

export const TIPO_AUSENCIA_LABELS: Record<TipoAusencia, string> = {
  'ATESTADO': 'Atestado Médico',
  'LICENCA_PREMIO': 'Licença Prêmio',
  'LICENCA_MATERNIDADE': 'Licença Maternidade',
  'LICENCA_PATERNIDADE': 'Licença Paternidade',
  'CURSO': 'Curso / Treinamento',
  'CESSAO': 'Cessão Funcional',
  'DISPOSICAO': 'À Disposição',
  'OUTROS': 'Outros Afastamentos',
};

export const EQUIPE_CORES: Record<string, { bg: string; text: string; border: string; light: string; badge: string }> = {
  'ALFA': { bg: 'bg-red-600', text: 'text-red-700', border: 'border-red-300', light: 'bg-red-50', badge: 'bg-red-100 text-red-800 border-red-200' },
  'BRAVO': { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-300', light: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  'CHARLIE': { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-300', light: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'CHARLE': { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-300', light: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'DELTA': { bg: 'bg-amber-600', text: 'text-amber-700', border: 'border-amber-300', light: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
};


export type TipoRemanejamento = 'REMANEJAMENTO_DEFICIT' | 'PERMUTA' | 'REFORCO' | 'EXTRA';

export interface RemanejamentoPlantao {
  id: string;
  policialId: string;
  equipeDestinoId: string;
  dataPlantao: string; // YYYY-MM-DD
  motivo: TipoRemanejamento;
  observacao?: string;
  criadoEm?: string;
}

export const TIPO_REMANEJAMENTO_LABELS: Record<TipoRemanejamento, string> = {
  'REMANEJAMENTO_DEFICIT': 'Completar Efetivo Mínimo (< 5)',
  'PERMUTA': 'Permuta / Troca de Plantão',
  'REFORCO': 'Reforço Operacional',
  'EXTRA': 'Hora Extra / Diária',
};


/**
 * Datas de referência canônicas para o ciclo contínuo das 4 equipes operacionais
 * Alfa, Bravo, Charlie e Delta no Estado do Ceará:
 * 
 * - 2x6 (Ciclo de 8 dias - 48h plantão / 6 dias folga):
 *   Bravo: 2026-11-07 e 08 (trabalha) -> 15/11...
 *   Delta: 2026-11-09 e 10 (trabalha) -> 17/11...
 *   Charlie: 2026-11-11 e 12 (trabalha) -> 19/11...
 *   Alfa: 2026-11-13 e 14 (trabalha) -> 21/11...
 * 
 * - 1x3 (Ciclo de 4 dias - 24h plantão / 72h folga):
 *   Bravo: 2026-11-07
 *   Delta: 2026-11-08
 *   Charlie: 2026-11-09
 *   Alfa: 2026-11-10
 * 
 * - 3x9 (Ciclo de 12 dias - 72h plantão / 9 dias folga):
 *   Bravo: 2026-11-07
 *   Delta: 2026-11-10
 *   Charlie: 2026-11-13
 *   Alfa: 2026-11-16
 */
export const EQUIPE_DATAS_REFERENCIA: Record<string, Record<RegimePlantao, string>> = {
  // Equipe Alfa (EQ-01 / 11111111-1111-1111-1111-111111111111)
  '11111111-1111-1111-1111-111111111111': {
    '1x3': '2026-11-10',
    '2x6': '2026-11-13',
    '3x9': '2026-11-16',
  },
  'ALFA': {
    '1x3': '2026-11-10',
    '2x6': '2026-11-13',
    '3x9': '2026-11-16',
  },
  // Equipe Bravo (EQ-02 / 22222222-2222-2222-2222-222222222222)
  '22222222-2222-2222-2222-222222222222': {
    '1x3': '2026-11-07',
    '2x6': '2026-11-07',
    '3x9': '2026-11-07',
  },
  'BRAVO': {
    '1x3': '2026-11-07',
    '2x6': '2026-11-07',
    '3x9': '2026-11-07',
  },
  // Equipe Charlie (EQ-03 / 33333333-3333-3333-3333-333333333333)
  '33333333-3333-3333-3333-333333333333': {
    '1x3': '2026-11-09',
    '2x6': '2026-11-11',
    '3x9': '2026-11-13',
  },
  'CHARLIE': {
    '1x3': '2026-11-09',
    '2x6': '2026-11-11',
    '3x9': '2026-11-13',
  },
  'CHARLE': {
    '1x3': '2026-11-09',
    '2x6': '2026-11-11',
    '3x9': '2026-11-13',
  },
  // Equipe Delta (EQ-04 / 44444444-4444-4444-4444-444444444444)
  '44444444-4444-4444-4444-444444444444': {
    '1x3': '2026-11-08',
    '2x6': '2026-11-09',
    '3x9': '2026-11-10',
  },
  'DELTA': {
    '1x3': '2026-11-08',
    '2x6': '2026-11-09',
    '3x9': '2026-11-10',
  },
};

/**
 * Retorna a data de referência oficial para a equipe e regime especificados
 */
export function getDataReferenciaPadrao(equipeIdOuNome: string, regime: RegimePlantao = '2x6'): string {
  const chave = equipeIdOuNome.toUpperCase();
  const mapa = EQUIPE_DATAS_REFERENCIA[equipeIdOuNome] || EQUIPE_DATAS_REFERENCIA[chave];
  if (mapa && mapa[regime]) {
    return mapa[regime];
  }
  // Se não encontrar por ID, tenta por nome
  if (chave.includes('ALFA')) return EQUIPE_DATAS_REFERENCIA['ALFA'][regime];
  if (chave.includes('BRAVO')) return EQUIPE_DATAS_REFERENCIA['BRAVO'][regime];
  if (chave.includes('CHARL')) return EQUIPE_DATAS_REFERENCIA['CHARLIE'][regime];
  if (chave.includes('DELTA')) return EQUIPE_DATAS_REFERENCIA['DELTA'][regime];
  return '2026-11-07';
}

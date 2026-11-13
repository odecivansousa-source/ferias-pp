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
}

export interface PlantaoEquipeDiario {
  equipeId: string;
  equipeNome: string;
  equipeCodigo: string;
  totalPoliciasEquipe: number;
  totalEscalados: number; // Quantos policiais desta equipe deveriam trabalhar hoje
  totalAusentes: number; // Quantos escalados estão ausentes
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

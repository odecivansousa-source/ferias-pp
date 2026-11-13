// Motor de Cálculo de Escalas e Plantões — Polícia Penal CE
import { Perfil, Equipe, SolicitacaoFerias } from '../types';
import {
  RegimePlantao,
  AusenciaPlantao,
  PolicialPlantao,
  PlantaoEquipeDiario,
  TIPO_AUSENCIA_LABELS
} from '../types/plantao';

export interface RegimeConfig {
  diasTrabalho: number;
  diasFolga: number;
  ciclo: number;
}

export function getRegimeConfig(regime: RegimePlantao): RegimeConfig {
  switch (regime) {
    case '1x3':
      return { diasTrabalho: 1, diasFolga: 3, ciclo: 4 };
    case '2x6':
      return { diasTrabalho: 2, diasFolga: 6, ciclo: 8 };
    case '3x9':
      return { diasTrabalho: 3, diasFolga: 9, ciclo: 12 };
    default:
      return { diasTrabalho: 1, diasFolga: 3, ciclo: 4 };
  }
}

/**
 * Calcula a diferença em dias corridos entre duas datas no formato YYYY-MM-DD
 */
export function diferencaEmDias(dataBase: string, dataAlvo: string): number {
  const d1 = new Date(`${dataBase}T12:00:00Z`);
  const d2 = new Date(`${dataAlvo}T12:00:00Z`);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se um policial está escalado para trabalhar em determinada data
 */
export function isPolicialEscalado(
  dataReferencia: string | undefined,
  regime: RegimePlantao | undefined,
  dataAlvo: string
): boolean {
  if (!dataReferencia || !regime) return false;

  const { diasTrabalho, ciclo } = getRegimeConfig(regime);
  const offset = diferencaEmDias(dataReferencia, dataAlvo);
  const posicaoNoCiclo = ((offset % ciclo) + ciclo) % ciclo;

  return posicaoNoCiclo < diasTrabalho;
}

/**
 * Verifica se o policial possui férias aprovadas em determinada data
 */
export function verificarFeriasAprovadas(
  policialId: string,
  dataAlvo: string,
  solicitacoes: SolicitacaoFerias[]
): boolean {
  return solicitacoes.some(sol => {
    if (sol.policialId !== policialId) return false;
    if (sol.status !== 'APROVADA') return false;

    return (sol.periodos || []).some(per => {
      return per.dataInicio <= dataAlvo && dataAlvo <= per.dataFim;
    });
  });
}

/**
 * Verifica se o policial possui afastamento ou atestado registrado na data
 */
export function verificarAusenciaCadastrada(
  policialId: string,
  dataAlvo: string,
  ausencias: AusenciaPlantao[]
): AusenciaPlantao | undefined {
  return ausencias.find(a => {
    return a.policialId === policialId && a.dataInicio <= dataAlvo && dataAlvo <= a.dataFim;
  });
}

/**
 * Calcula o detalhamento de plantão para todas as equipes em um determinado dia
 */
export function calcularPlantoesDia(
  dataAlvo: string,
  perfis: Perfil[],
  equipes: Equipe[],
  ausencias: AusenciaPlantao[],
  solicitacoes: SolicitacaoFerias[],
  efetivoMinimo: number = 5,
  efetivoAlerta: number = 4
): PlantaoEquipeDiario[] {
  // Apenas policiais ativos e com função policial/diretor com escala
  // Diretor trabalha em horário comercial/expediente, não participa da escala de plantão 24h
  const policiaisAtivos = perfis.filter(p => p.situacao === 'ativo' && p.papel !== 'diretor' && (p.papel as string) !== 'admin');

  return equipes.map(equipe => {
    const membrosEquipe = policiaisAtivos.filter(p => p.equipeId === equipe.id);

    const policiaisDetalhe: PolicialPlantao[] = membrosEquipe.map(pol => {
      const escalado = isPolicialEscalado(pol.dataReferenciaPlantao, pol.regime, dataAlvo);

      // Checa ausências
      const emFerias = verificarFeriasAprovadas(pol.id, dataAlvo, solicitacoes);
      const outraAusencia = verificarAusenciaCadastrada(pol.id, dataAlvo, ausencias);

      let ausente = false;
      let motivoAusencia: string | undefined = undefined;

      if (emFerias) {
        ausente = true;
        motivoAusencia = 'FÉRIAS';
      } else if (outraAusencia) {
        ausente = true;
        motivoAusencia = TIPO_AUSENCIA_LABELS[outraAusencia.tipo] || 'AFASTADO';
      }

      return {
        id: pol.id,
        nome: pol.nomeCompleto,
        matricula: pol.matricula,
        equipeId: equipe.id,
        regime: pol.regime,
        dataReferencia: pol.dataReferenciaPlantao,
        escalado,
        ausente,
        motivoAusencia,
        presente: escalado && !ausente,
      };
    });

    const escalados = policiaisDetalhe.filter(p => p.escalado);
    const ausentes = escalados.filter(p => p.ausente);
    const efetivoReal = escalados.length - ausentes.length;

    let status: 'OK' | 'ALERTA' | 'CRITICO' = 'OK';
    if (escalados.length > 0) {
      if (efetivoReal < efetivoAlerta) {
        status = 'CRITICO';
      } else if (efetivoReal < efetivoMinimo) {
        status = 'ALERTA';
      }
    }

    return {
      equipeId: equipe.id,
      equipeNome: equipe.nome,
      equipeCodigo: equipe.codigo,
      totalPoliciasEquipe: membrosEquipe.length,
      totalEscalados: escalados.length,
      totalAusentes: ausentes.length,
      efetivoReal,
      status,
      policiais: policiaisDetalhe,
    };
  });
}

/**
 * Retorna os próximos N dias de plantão para um policial específico
 */
export function getProximosPlantoesPolicial(
  policial: Perfil,
  diasAFrente: number = 30,
  dataInicialStr?: string
): { data: string; trabalhando: boolean }[] {
  const dataInicio = dataInicialStr ? new Date(`${dataInicialStr}T12:00:00Z`) : new Date();
  const resultados: { data: string; trabalhando: boolean }[] = [];

  for (let i = 0; i < diasAFrente; i++) {
    const d = new Date(dataInicio);
    d.setDate(d.getDate() + i);
    const dataStr = d.toISOString().split('T')[0];
    const trabalhando = isPolicialEscalado(policial.dataReferenciaPlantao, policial.regime, dataStr);
    resultados.push({ data: dataStr, trabalhando });
  }

  return resultados;
}

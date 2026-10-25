import { PeriodoFerias, SolicitacaoFerias, Equipe, ConflitoDia } from '../types';

export interface ValidacaoPeriodoResultado {
  valido: boolean;
  mensagem: string;
}

export interface AnaliseConflitoResultado {
  temConflito: boolean;
  diasConflitantes: ConflitoDia[];
  mensagem: string;
  sugestao?: string;
  afastadosMaximosNoPeriodo: number;
  limiteEquipe: number;
}

/**
 * Valida a integridade das datas de um conjunto de períodos conforme a modalidade escolhida
 */
export function validarPeriodosModalidade(
  modalidade: '30_DIAS' | '2x15_DIAS' | '3x10_DIAS',
  periodos: { dataInicio: string; dataFim: string }[]
): ValidacaoPeriodoResultado {
  if (!periodos || periodos.length === 0) {
    return { valido: false, mensagem: 'Pelo menos um período de férias deve ser informado.' };
  }

  const expectedPeriods = modalidade === '30_DIAS' ? 1 : modalidade === '2x15_DIAS' ? 2 : 3;
  const expectedDays = modalidade === '30_DIAS' ? [30] : modalidade === '2x15_DIAS' ? [15, 15] : [10, 10, 10];

  if (periodos.length !== expectedPeriods) {
    return {
      valido: false,
      mensagem: `A modalidade selecionada exige exatamente ${expectedPeriods} período(s).`,
    };
  }

  // 1. Validar cada período individualmente
  for (let i = 0; i < periodos.length; i++) {
    const p = periodos[i];
    if (!p.dataInicio || !p.dataFim) {
      return { valido: false, mensagem: `Preencha as datas de início e fim do Período ${i + 1}.` };
    }

    const start = new Date(p.dataInicio + 'T00:00:00');
    const end = new Date(p.dataFim + 'T00:00:00');

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valido: false, mensagem: `Data inválida no Período ${i + 1}.` };
    }

    if (end < start) {
      return {
        valido: false,
        mensagem: `A data de término não pode ser anterior à data de início no Período ${i + 1}.`,
      };
    }

    // Cálculo exato de dias corridos inclusive
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays !== expectedDays[i]) {
      return {
        valido: false,
        mensagem: `O Período ${i + 1} deve ter exatamente ${expectedDays[i]} dias corridos (selecionado: ${diffDays} dias).`,
      };
    }
  }

  // 2. Verificar sobreposição entre períodos da própria solicitação
  for (let i = 0; i < periodos.length; i++) {
    for (let j = i + 1; j < periodos.length; j++) {
      const startA = new Date(periodos[i].dataInicio + 'T00:00:00').getTime();
      const endA = new Date(periodos[i].dataFim + 'T00:00:00').getTime();
      const startB = new Date(periodos[j].dataInicio + 'T00:00:00').getTime();
      const endB = new Date(periodos[j].dataFim + 'T00:00:00').getTime();

      if (startA <= endB && startB <= endA) {
        return {
          valido: false,
          mensagem: `Os períodos ${i + 1} e ${j + 1} possuem datas sobrepostas.`,
        };
      }
    }
  }

  return { valido: true, mensagem: 'Períodos válidos!' };
}

/**
 * Calcula a data de término sugerida dado uma data inicial e a quantidade de dias
 */
export function calcularDataFim(dataInicio: string, dias: number): string {
  if (!dataInicio) return '';
  const d = new Date(dataInicio + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  // d + (dias - 1) dias
  d.setDate(d.getDate() + (dias - 1));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Analisa se um ou mais períodos apresentam conflito com as férias JÁ APROVADAS da equipe
 */
export function analisarConflitosSolicitacao(
  equipe: Equipe,
  periodosPropostos: { dataInicio: string; dataFim: string }[],
  todasSolicitacoes: SolicitacaoFerias[],
  ignorarSolicitacaoId?: string
): AnaliseConflitoResultado {
  const limite = equipe.limiteAfastamentosSimultaneos;
  const diasConflitantesMap = new Map<string, ConflitoDia>();
  let maxAfastadosGeral = 0;

  // Filtrar apenas solicitações APROVADAS da mesma equipe (rejeitadas e canceladas são desconsideradas)
  const solicitacoesAprovadas = todasSolicitacoes.filter(s => 
    s.equipeId === equipe.id &&
    s.status === 'APROVADA' &&
    (!ignorarSolicitacaoId || s.id !== ignorarSolicitacaoId)
  );

  periodosPropostos.forEach(pProp => {
    if (!pProp.dataInicio || !pProp.dataFim) return;

    const curr = new Date(pProp.dataInicio + 'T00:00:00');
    const end = new Date(pProp.dataFim + 'T00:00:00');

    while (curr <= end) {
      const dataStr = curr.toISOString().split('T')[0];

      // Verificar quantos policiais da mesma equipe já estão aprovados nesta data
      const policiaisNesteDia: { nome: string; matricula: string; status: 'APROVADA' }[] = [];

      solicitacoesAprovadas.forEach(sol => {
        const estaAfas = sol.periodos.some(p => {
          return dataStr >= p.dataInicio && dataStr <= p.dataFim;
        });

        if (estaAfas && sol.policial) {
          policiaisNesteDia.push({
            nome: sol.policial.nomeCompleto,
            matricula: sol.policial.matricula,
            status: 'APROVADA',
          });
        }
      });

      const totalAfastados = policiaisNesteDia.length;
      if (totalAfastados > maxAfastadosGeral) {
        maxAfastadosGeral = totalAfastados;
      }

      // Se somando este policial (totalAfastados + 1) ultrapassar o limite da equipe
      if (totalAfastados >= limite) {
        diasConflitantesMap.set(dataStr, {
          data: dataStr,
          totalAfastados,
          limiteEquipe: limite,
          equipeId: equipe.id,
          equipeNome: equipe.nome,
          temConflito: true,
          policiaisAfastados: policiaisNesteDia,
        });
      }

      curr.setDate(curr.getDate() + 1);
    }
  });

  const diasConflitantes = Array.from(diasConflitantesMap.values()).sort((a, b) => a.data.localeCompare(b.data));
  const temConflito = diasConflitantes.length > 0;

  if (temConflito) {
    const primeiroDia = formatarDataBR(diasConflitantes[0].data);
    const ultimoDia = formatarDataBR(diasConflitantes[diasConflitantes.length - 1].data);
    const qtdDias = diasConflitantes.length;

    return {
      temConflito: true,
      diasConflitantes,
      afastadosMaximosNoPeriodo: maxAfastadosGeral,
      limiteEquipe: limite,
      mensagem: `Este período apresenta conflito com o limite de afastamentos configurado para sua equipe (${limite} policiais simultâneos). Foram identificados ${qtdDias} dia(s) com vagas esgotadas entre ${primeiroDia} e ${ultimoDia}. Escolha outras datas ou aguarde a análise da administração.`,
      sugestao: `Considere adiantar ou postergar suas datas para meses com menor concorrência na ${equipe.nome}.`,
    };
  }

  return {
    temConflito: false,
    diasConflitantes: [],
    afastadosMaximosNoPeriodo: maxAfastadosGeral,
    limiteEquipe: limite,
    mensagem: `Período em conformidade com o limite de efetivo da equipe (${maxAfastadosGeral} de ${limite} vagas ocupadas no período).`,
  };
}

export function formatarDataBR(dataStr: string): string {
  if (!dataStr) return '';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

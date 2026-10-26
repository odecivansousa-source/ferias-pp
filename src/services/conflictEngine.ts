import { PeriodoFerias, SolicitacaoFerias, Equipe, ConflitoDia, StatusSolicitacao } from '../types';

export interface ValidacaoPeriodoResultado {
  valido: boolean;
  mensagem: string;
}

export interface ConflitoColega {
  solicitacaoId: string;
  policialId: string;
  nome: string;
  matricula: string;
  status: StatusSolicitacao;
  periodoColegaInicio: string;
  periodoColegaFim: string;
  periodoPropostoNumero: number;
  inicioSobreposicao: string;
  fimSobreposicao: string;
  diasSobrepostos: number;
}

export interface AnaliseConflitoResultado {
  temConflito: boolean; // Verdadeiro se excede limite com férias já APROVADAS
  temConcorrencia: boolean; // Verdadeiro se colide com APROVADAS ou PENDENTES
  temAprovadas: boolean;
  temPendentes: boolean;
  colegasConflitantes: ConflitoColega[];
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
 * Analisa se um ou mais períodos propostos colidem com férias APROVADAS ou PENDENTES
 * de outros policiais da mesma equipe, respeitando o limite da unidade (geralmente 1 policial).
 */
export function analisarConflitosSolicitacao(
  equipe: Equipe,
  periodosPropostos: { dataInicio: string; dataFim: string }[],
  todasSolicitacoes: SolicitacaoFerias[],
  ignorarSolicitacaoId?: string,
  policialAtualId?: string
): AnaliseConflitoResultado {
  const limite = equipe.limiteAfastamentosSimultaneos || 1;
  const diasConflitantesMap = new Map<string, ConflitoDia>();
  const colegasConflitantesMap = new Map<string, ConflitoColega>();
  let maxAfastadosGeral = 0;

  // Filtrar solicitações ativas da MESMA equipe (ignora o próprio policial e solicitações canceladas/rejeitadas)
  const solicitacoesEquipe = todasSolicitacoes.filter(s =>
    s.equipeId === equipe.id &&
    (!ignorarSolicitacaoId || s.id !== ignorarSolicitacaoId) &&
    (!policialAtualId || s.policialId !== policialAtualId) &&
    s.status !== 'DEVOLVIDA' &&
    s.status !== 'REJEITADA' &&
    s.status !== 'CANCELADA' &&
    s.status !== 'RASCUNHO'
  );

  periodosPropostos.forEach((pProp, propIdx) => {
    if (!pProp.dataInicio || !pProp.dataFim) return;

    const propNum = propIdx + 1;

    // 1. Identificar choque direto de intervalos com outros policiais da equipe
    solicitacoesEquipe.forEach(sol => {
      const colegaNome = sol.policial?.nomeCompleto || 'Policial Penal';
      const colegaMatricula = sol.policial?.matricula || '-';

      sol.periodos.forEach(pColega => {
        if (!pColega.dataInicio || !pColega.dataFim) return;

        // Há sobreposição se: início1 <= fim2 E início2 <= fim1
        if (pProp.dataInicio <= pColega.dataFim && pColega.dataInicio <= pProp.dataFim) {
          const inicioSob = pProp.dataInicio > pColega.dataInicio ? pProp.dataInicio : pColega.dataInicio;
          const fimSob = pProp.dataFim < pColega.dataFim ? pProp.dataFim : pColega.dataFim;

          const startMs = new Date(inicioSob + 'T00:00:00').getTime();
          const endMs = new Date(fimSob + 'T00:00:00').getTime();
          const diasSob = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

          const key = `${sol.id}_${pColega.id || pColega.dataInicio}_prop${propNum}`;
          if (!colegasConflitantesMap.has(key)) {
            colegasConflitantesMap.set(key, {
              solicitacaoId: sol.id,
              policialId: sol.policialId,
              nome: colegaNome,
              matricula: colegaMatricula,
              status: sol.status,
              periodoColegaInicio: pColega.dataInicio,
              periodoColegaFim: pColega.dataFim,
              periodoPropostoNumero: propNum,
              inicioSobreposicao: inicioSob,
              fimSobreposicao: fimSob,
              diasSobrepostos: diasSob,
            });
          }
        }
      });
    });

    // 2. Análise dia a dia para contagem de capacidade e limites de vagas
    const curr = new Date(pProp.dataInicio + 'T00:00:00');
    const end = new Date(pProp.dataFim + 'T00:00:00');

    while (curr <= end) {
      const dataStr = curr.toISOString().split('T')[0];

      const policiaisAprovadosNesteDia: { nome: string; matricula: string; status: StatusSolicitacao }[] = [];
      const policiaisPendentesNesteDia: { nome: string; matricula: string; status: StatusSolicitacao }[] = [];

      solicitacoesEquipe.forEach(sol => {
        const estaAfas = sol.periodos.some(p => dataStr >= p.dataInicio && dataStr <= p.dataFim);
        if (estaAfas) {
          const item = {
            nome: sol.policial?.nomeCompleto || 'Policial Penal',
            matricula: sol.policial?.matricula || '-',
            status: sol.status,
          };
          if (sol.status === 'APROVADA') {
            policiaisAprovadosNesteDia.push(item);
          } else {
            policiaisPendentesNesteDia.push(item);
          }
        }
      });

      const totalAprovados = policiaisAprovadosNesteDia.length;
      const totalMovimento = totalAprovados + policiaisPendentesNesteDia.length;

      if (totalAprovados > maxAfastadosGeral) {
        maxAfastadosGeral = totalAprovados;
      }

      // Se somando este policial (totalAprovados + 1) ultrapassar o limite de aprovados
      if (totalAprovados >= limite) {
        diasConflitantesMap.set(dataStr, {
          data: dataStr,
          totalAfastados: totalAprovados,
          limiteEquipe: limite,
          equipeId: equipe.id,
          equipeNome: equipe.nome,
          temConflito: true,
          policiaisAfastados: [...policiaisAprovadosNesteDia, ...policiaisPendentesNesteDia],
        });
      }

      curr.setDate(curr.getDate() + 1);
    }
  });

  const colegasConflitantes = Array.from(colegasConflitantesMap.values());
  const diasConflitantes = Array.from(diasConflitantesMap.values()).sort((a, b) => a.data.localeCompare(b.data));

  const temAprovadas = colegasConflitantes.some(c => c.status === 'APROVADA') || diasConflitantes.length > 0;
  const temPendentes = colegasConflitantes.some(c => c.status === 'PENDENTE' || c.status === 'DEVOLVIDA');
  const temConcorrencia = colegasConflitantes.length > 0;
  const temConflito = temAprovadas; // Para travar aprovação formal de duas pessoas simultâneas

  // Montar mensagem institucional e formal
  let mensagem = '';
  let sugestao = '';

  if (temAprovadas) {
    const colegasAprovados = colegasConflitantes.filter(c => c.status === 'APROVADA');
    const nomes = Array.from(new Set(colegasAprovados.map(c => `${c.nome} (Matrícula: ${c.matricula})`))).join(', ');
    const dias = diasConflitantes.length;

    mensagem = `Período indisponível para fruição na ${equipe.nome}. Em cumprimento às diretrizes de segurança da unidade prisional (limite de ${limite} servidor em gozo de férias por escala), já constam férias homologadas pela Direção para: ${nomes || 'outro servidor'}. Constatados ${dias > 0 ? dias : 'múltiplos'} dias com o teto de afastamentos atingido.`;
    sugestao = `Solicitamos a indicação de um período alternativo no cronograma anual para viabilizar o deferimento e a homologação pela Direção da Unidade.`;
  } else if (temPendentes) {
    const colegasPend = colegasConflitantes.filter(c => c.status === 'PENDENTE' || c.status === 'DEVOLVIDA');
    const qtdColegas = new Set(colegasPend.map(c => c.policialId)).size;
    const textoQtd = qtdColegas === 1 ? '1 servidor com requerimento em tramitação' : `${qtdColegas} servidores com requerimentos em tramitação`;

    mensagem = `Constatada sobreposição de datas na ${equipe.nome}. Em conformidade com o plano de segurança e o efetivo da unidade prisional, o teto operacional é de ${limite} servidor por escala de plantão. Atualmente, há ${textoQtd} para o mesmo intervalo.`;
    sugestao = `A deliberação das solicitações concorrentes caberá à Direção da Unidade com base nos critérios regimentais (antiguidade, escala e interesse do serviço). Para assegurar a homologação imediata sem concorrência, recomenda-se a seleção de datas livres no calendário.`;
  } else {
    mensagem = `Período em plena conformidade com as diretrizes operacionais da ${equipe.nome}. Não constam registros de outros servidores para este intervalo (vaga regular disponível).`;
  }

  return {
    temConflito,
    temConcorrencia,
    temAprovadas,
    temPendentes,
    colegasConflitantes,
    diasConflitantes,
    afastadosMaximosNoPeriodo: maxAfastadosGeral,
    limiteEquipe: limite,
    mensagem,
    sugestao: sugestao || undefined,
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

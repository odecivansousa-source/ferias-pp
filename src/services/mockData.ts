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

// Gerador de 120 Policiais Penais Fictícios (30 por equipe) devidamente rotulados como dados de teste
export function generateMockPoliciais(): Perfil[] {
  const perfis: Perfil[] = [
    // Usuário Administrador de Teste
    {
      id: 'usr-admin',
      matricula: 'ADM-99001',
      nomeCompleto: 'Gestor Administrativo Costa [DEMO]',
      equipeId: 'eq-1',
      papel: 'admin',
      situacao: 'ativo',
      email: 'admin.teste@unidade.sap.sp.gov.br',
      telefone: '(11) 98000-0001',
    },
    // Usuário Diretor de Teste
    {
      id: 'usr-diretor',
      matricula: 'DIR-99002',
      nomeCompleto: 'Diretor de Segurança Dr. Ramos [DEMO]',
      equipeId: 'eq-2',
      papel: 'diretor',
      situacao: 'ativo',
      email: 'diretoria.teste@unidade.sap.sp.gov.br',
      telefone: '(11) 98000-0002',
    },
  ];

  const sobrenomes = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
    'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
    'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
    'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos'
  ];

  let idCounter = 1;

  MOCK_EQUIPES.forEach((eq, eqIdx) => {
    for (let i = 1; i <= 30; i++) {
      const numFormatted = String(idCounter).padStart(3, '0');
      const sobrenome = sobrenomes[(idCounter - 1) % sobrenomes.length];
      
      perfis.push({
        id: `pol-${numFormatted}`,
        matricula: `PP-2026-${numFormatted}`,
        nomeCompleto: `Policial Teste ${numFormatted} - ${sobrenome} [DEMO]`,
        equipeId: eq.id,
        papel: 'policial',
        situacao: 'ativo',
        email: `policial.${numFormatted}@unidade.demo`,
        telefone: `(11) 97000-${numFormatted}`,
      });

      idCounter++;
    }
  });

  return perfis;
}

// Gerador de solicitações de exemplo para popular o calendário de demonstração
export function generateMockSolicitacoes(perfis: Perfil[]): { solicitacoes: SolicitacaoFerias[]; historico: HistoricoAuditoria[] } {
  const solicitacoes: SolicitacaoFerias[] = [];
  const historico: HistoricoAuditoria[] = [];

  // Amostra de solicitações aprovadas e pendentes para 2026
  const samplePlans = [
    // Equipe 1
    { polIdx: 2, mod: '30_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-03-01', fim: '2026-03-30', dias: 30 }] },
    { polIdx: 3, mod: '2x15_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-03-01', fim: '2026-03-15', dias: 15 }, { ini: '2026-09-01', fim: '2026-09-15', dias: 15 }] },
    { polIdx: 4, mod: '30_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-03-01', fim: '2026-03-30', dias: 30 }] }, // 3 aprovados em março (atinge o limite!)
    { polIdx: 5, mod: '30_DIAS' as const, status: 'PENDENTE' as const, p: [{ ini: '2026-03-10', fim: '2026-04-08', dias: 30 }] }, // Conflito com março!
    { polIdx: 6, mod: '3x10_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-05-01', fim: '2026-05-10', dias: 10 }, { ini: '2026-08-01', fim: '2026-08-10', dias: 10 }, { ini: '2026-11-01', fim: '2026-11-10', dias: 10 }] },
    { polIdx: 7, mod: '30_DIAS' as const, status: 'DEVOLVIDA' as const, p: [{ ini: '2026-07-01', fim: '2026-07-30', dias: 30 }], just: 'Período solicitado coincide com operação especial de transferência da unidade. Favor escolher novo mês.' },

    // Equipe 2
    { polIdx: 32, mod: '30_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-04-01', fim: '2026-04-30', dias: 30 }] },
    { polIdx: 33, mod: '2x15_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-04-16', fim: '2026-04-30', dias: 15 }, { ini: '2026-10-01', fim: '2026-10-15', dias: 15 }] },
    { polIdx: 34, mod: '30_DIAS' as const, status: 'PENDENTE' as const, p: [{ ini: '2026-06-01', fim: '2026-06-30', dias: 30 }] },
    { polIdx: 35, mod: '30_DIAS' as const, status: 'PENDENTE' as const, p: [{ ini: '2026-07-01', fim: '2026-07-30', dias: 30 }] },

    // Equipe 3
    { polIdx: 62, mod: '30_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-01-10', fim: '2026-02-08', dias: 30 }] },
    { polIdx: 63, mod: '2x15_DIAS' as const, status: 'PENDENTE' as const, p: [{ ini: '2026-06-15', fim: '2026-06-29', dias: 15 }, { ini: '2026-11-15', fim: '2026-11-29', dias: 15 }] },

    // Equipe 4
    { polIdx: 92, mod: '30_DIAS' as const, status: 'APROVADA' as const, p: [{ ini: '2026-05-15', fim: '2026-06-13', dias: 30 }] },
    { polIdx: 93, mod: '30_DIAS' as const, status: 'PENDENTE' as const, p: [{ ini: '2026-08-01', fim: '2026-08-30', dias: 30 }] },
  ];

  samplePlans.forEach((sp, idx) => {
    const pol = perfis[sp.polIdx] || perfis[2];
    const eq = MOCK_EQUIPES.find(e => e.id === pol.equipeId) || MOCK_EQUIPES[0];
    const solId = `sol-demo-${idx + 1}`;

    const periodos = sp.p.map((p, pIdx) => ({
      id: `per-${solId}-${pIdx + 1}`,
      solicitacaoId: solId,
      numeroPeriodo: pIdx + 1,
      dataInicio: p.ini,
      dataFim: p.fim,
      quantidadeDias: p.dias,
    }));

    const solicitacao: SolicitacaoFerias = {
      id: solId,
      policialId: pol.id,
      equipeId: eq.id,
      anoExercicio: 2026,
      modalidade: sp.mod,
      status: sp.status,
      observacaoPolicial: 'Plano anual de férias submetido para validação.',
      justificativaDecisao: (sp as any).just || (sp.status === 'APROVADA' ? 'Aprovado conforme escala da equipe.' : undefined),
      decididaPor: sp.status === 'APROVADA' || sp.status === 'DEVOLVIDA' ? 'usr-diretor' : undefined,
      decididaEm: sp.status === 'APROVADA' || sp.status === 'DEVOLVIDA' ? '2026-01-15T10:30:00Z' : undefined,
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-15T10:30:00Z',
      periodos,
      policial: pol,
      equipe: eq,
    };

    solicitacoes.push(solicitacao);

    if (sp.status !== 'PENDENTE') {
      historico.push({
        id: `hist-${idx + 1}`,
        solicitacaoId: solId,
        responsavelId: 'usr-diretor',
        responsavelNome: 'Diretor de Segurança Dr. Ramos [DEMO]',
        acao: sp.status === 'APROVADA' ? 'APROVACAO' : 'DEVOLUCAO',
        statusAnterior: 'PENDENTE',
        novoStatus: sp.status,
        justificativa: solicitacao.justificativaDecisao,
        createdAt: '2026-01-15T10:30:00Z',
      });
    }
  });

  return { solicitacoes, historico };
}

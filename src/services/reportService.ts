import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SolicitacaoFerias, Equipe, Perfil } from '../types';
import { formatarDataBR } from './conflictEngine';

export type TipoRelatorio = 
  | 'CONSOLIDADO'
  | 'POR_EQUIPE'
  | 'PENDENTES'
  | 'CONFLITOS'
  | 'APROVADAS';

export interface ParametrosRelatorio {
  tipo: TipoRelatorio;
  anoExercicio: number;
  equipeId?: string; // 'TODAS' ou ID específico
  solicitacoes: SolicitacaoFerias[];
  equipes: Equipe[];
  perfis: Perfil[];
}

/**
 * Gera e baixa o arquivo CSV compatível com Microsoft Excel (UTF-8 com BOM e ponto-e-vírgula)
 */
export function exportarRelatorioCSV(params: ParametrosRelatorio): void {
  const { tipo, anoExercicio, equipeId, solicitacoes, equipes } = params;

  // Filtragem dos dados conforme os parâmetros
  let filtradas = solicitacoes.filter(s => s.anoExercicio === anoExercicio);

  if (equipeId && equipeId !== 'TODAS') {
    filtradas = filtradas.filter(s => s.equipeId === equipeId);
  }

  if (tipo === 'PENDENTES') {
    filtradas = filtradas.filter(s => s.status === 'PENDENTE');
  } else if (tipo === 'APROVADAS') {
    filtradas = filtradas.filter(s => s.status === 'APROVADA');
  } else if (tipo === 'CONFLITOS') {
    // Solicitações que ainda estão com status pendente ou devolvida em datas de alta concorrência
    filtradas = filtradas.filter(s => s.status === 'PENDENTE' || s.status === 'DEVOLVIDA');
  }

  const cabecalho = [
    'Matricula',
    'Nome do Policial',
    'Equipe',
    'Modalidade',
    'Status',
    'Periodo 1 - Inicio',
    'Periodo 1 - Fim',
    'Periodo 1 - Dias',
    'Periodo 2 - Inicio',
    'Periodo 2 - Fim',
    'Periodo 2 - Dias',
    'Periodo 3 - Inicio',
    'Periodo 3 - Fim',
    'Periodo 3 - Dias',
    'Total de Dias',
    'Decisao / Justificativa',
  ];

  const linhas: string[][] = [];

  filtradas.forEach(sol => {
    const p1 = sol.periodos[0];
    const p2 = sol.periodos[1];
    const p3 = sol.periodos[2];

    const totalDias = sol.periodos.reduce((acc, p) => acc + (p.quantidadeDias || 0), 0);

    linhas.push([
      `"${sol.policial?.matricula || '-'}"`,
      `"${sol.policial?.nomeCompleto || '-'}"`,
      `"${sol.equipe?.nome || '-'}"`,
      `"${sol.modalidade.replace('_', ' ')}"`,
      `"${sol.status}"`,
      `"${p1 ? formatarDataBR(p1.dataInicio) : '-'}"`,
      `"${p1 ? formatarDataBR(p1.dataFim) : '-'}"`,
      `"${p1 ? p1.quantidadeDias : 0}"`,
      `"${p2 ? formatarDataBR(p2.dataInicio) : '-'}"`,
      `"${p2 ? formatarDataBR(p2.dataFim) : '-'}"`,
      `"${p2 ? p2.quantidadeDias : 0}"`,
      `"${p3 ? formatarDataBR(p3.dataInicio) : '-'}"`,
      `"${p3 ? formatarDataBR(p3.dataFim) : '-'}"`,
      `"${p3 ? p3.quantidadeDias : 0}"`,
      `"${totalDias}"`,
      `"${(sol.justificativaDecisao || sol.observacaoPolicial || '-').replace(/"/g, '""')}"`,
    ]);
  });

  // UTF-8 BOM (\uFEFF) para forçar o Excel a reconhecer caracteres portugueses
  let csvContent = '\uFEFF';
  csvContent += cabecalho.join(';') + '\r\n';

  linhas.forEach(row => {
    csvContent += row.join(';') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `SAP_RELATORIO_FERIAS_${tipo}_${anoExercicio}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Gera e baixa o arquivo PDF Oficial formatado para a Secretaria de Administração Penitenciária (SAP)
 */
export function exportarRelatorioPDF(params: ParametrosRelatorio): void {
  const { tipo, anoExercicio, equipeId, solicitacoes, equipes } = params;

  let filtradas = solicitacoes.filter(s => s.anoExercicio === anoExercicio);

  if (equipeId && equipeId !== 'TODAS') {
    filtradas = filtradas.filter(s => s.equipeId === equipeId);
  }

  if (tipo === 'PENDENTES') {
    filtradas = filtradas.filter(s => s.status === 'PENDENTE');
  } else if (tipo === 'APROVADAS') {
    filtradas = filtradas.filter(s => s.status === 'APROVADA');
  } else if (tipo === 'CONFLITOS') {
    filtradas = filtradas.filter(s => s.status === 'PENDENTE' || s.status === 'DEVOLVIDA');
  }

  // Ordenar por equipe e depois por nome
  filtradas.sort((a, b) => {
    const eqA = a.equipe?.nome || '';
    const eqB = b.equipe?.nome || '';
    if (eqA !== eqB) return eqA.localeCompare(eqB);
    return (a.policial?.nomeCompleto || '').localeCompare(b.policial?.nomeCompleto || '');
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nomeEquipeSelecionada = equipeId && equipeId !== 'TODAS'
    ? (equipes.find(e => e.id === equipeId)?.nome || 'Equipe Selecionada')
    : 'Todas as Equipes (Plantões 1, 2, 3 e 4)';

  const titulosPorTipo: Record<TipoRelatorio, string> = {
    CONSOLIDADO: 'ESCALA GERAL CONSOLIDADA DE FÉRIAS',
    POR_EQUIPE: `ESCALA DE FÉRIAS — ${nomeEquipeSelecionada.toUpperCase()}`,
    PENDENTES: 'RELATÓRIO DE SOLICITAÇÕES PENDENTES DE ANÁLISE',
    CONFLITOS: 'MAPA DE CONFLITOS E AJUSTES DE EFETIVO',
    APROVADAS: 'ESCALA OFICIAL HOMOLOGADA DE FÉRIAS',
  };

  const tituloPrincipal = titulosPorTipo[tipo];

  // Cabeçalho Institucional
  doc.setFillColor(15, 36, 58); // navy-900 (#0f243a)
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(245, 158, 11); // gold-500
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SECRETARIA DA ADMINISTRAÇÃO PENITENCIÁRIA — SAP', 14, 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`UNIDADE PRISIONAL | SISTEMA FÉRIAS PP — EXERCÍCIO ${anoExercicio}`, 14, 18);

  // Subtítulo do Relatório
  doc.setTextColor(15, 36, 58);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tituloPrincipal, 14, 33);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  doc.text(`Emissão: ${dataEmissao} | Total de Registros: ${filtradas.length} | Filtro: ${nomeEquipeSelecionada}`, 14, 38);

  // Linhas da Tabela
  const tableData = filtradas.map(sol => {
    const periodosFormatados = sol.periodos.map(p => 
      `${formatarDataBR(p.dataInicio)} a ${formatarDataBR(p.dataFim)} (${p.quantidadeDias}d)`
    ).join('\n');

    return [
      sol.policial?.matricula || '-',
      sol.policial?.nomeCompleto || '-',
      sol.equipe?.nome || '-',
      sol.modalidade.replace('_', ' '),
      periodosFormatados || 'Não definido',
      sol.status,
      sol.justificativaDecisao || sol.observacaoPolicial || '-',
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Matrícula', 'Policial Penal', 'Equipe / Plantão', 'Modalidade', 'Períodos Solicitados', 'Situação', 'Observações / Decisão']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 36, 58],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 24 },
      4: { cellWidth: 52 },
      5: { cellWidth: 26, fontStyle: 'bold' },
      6: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // Cores para a coluna de Situação
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.cell.raw;
        if (val === 'APROVADA') {
          data.cell.styles.textColor = [22, 101, 52]; // Verde
        } else if (val === 'PENDENTE') {
          data.cell.styles.textColor = [180, 83, 9]; // Amarelo/Laranja
        } else if (val === 'DEVOLVIDA') {
          data.cell.styles.textColor = [30, 64, 175]; // Azul
        } else if (val === 'REJEITADA') {
          data.cell.styles.textColor = [153, 27, 27]; // Vermelho
        }
      }
    },
    didDrawPage: (data) => {
      // Rodapé com número de página e chancela
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `FÉRIAS PP — Sistema de Planejamento de Férias | Documento de Controle Interno — Página ${data.pageNumber} de ${pageCount}`,
        14,
        202
      );
    },
  });

  doc.save(`SAP_RELATORIO_FERIAS_${tipo}_${anoExercicio}.pdf`);
}

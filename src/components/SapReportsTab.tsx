import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Printer,
  Sparkles
} from 'lucide-react';
import { SolicitacaoFerias, Equipe, Perfil } from '../types';
import { exportarRelatorioCSV, exportarRelatorioPDF, TipoRelatorio } from '../services/reportService';
import { formatarDataBR } from '../services/conflictEngine';

interface SapReportsTabProps {
  solicitacoes: SolicitacaoFerias[];
  equipes: Equipe[];
  perfis: Perfil[];
  anoAtual: number;
}

export const SapReportsTab: React.FC<SapReportsTabProps> = ({
  solicitacoes,
  equipes,
  perfis,
  anoAtual,
}) => {
  const [tipo, setTipo] = useState<TipoRelatorio>('CONSOLIDADO');
  const [ano, setAno] = useState<number>(anoAtual || 2026);
  const [equipeId, setEquipeId] = useState<string>('TODAS');

  // Filtragem para o preview visual na tela
  let dadosFiltrados = solicitacoes.filter(s => s.anoExercicio === ano);

  if (equipeId !== 'TODAS') {
    dadosFiltrados = dadosFiltrados.filter(s => s.equipeId === equipeId);
  }

  if (tipo === 'PENDENTES') {
    dadosFiltrados = dadosFiltrados.filter(s => s.status === 'PENDENTE');
  } else if (tipo === 'APROVADAS') {
    dadosFiltrados = dadosFiltrados.filter(s => s.status === 'APROVADA');
  } else if (tipo === 'CONFLITOS') {
    dadosFiltrados = dadosFiltrados.filter(s => s.status === 'PENDENTE' || s.status === 'DEVOLVIDA');
  }

  const handleExportCSV = () => {
    exportarRelatorioCSV({
      tipo,
      anoExercicio: ano,
      equipeId,
      solicitacoes,
      equipes,
      perfis,
    });
  };

  const handleExportPDF = () => {
    exportarRelatorioPDF({
      tipo,
      anoExercicio: ano,
      equipeId,
      solicitacoes,
      equipes,
      perfis,
    });
  };

  const relatoriosDescricoes: Record<TipoRelatorio, { titulo: string; desc: string }> = {
    CONSOLIDADO: {
      titulo: 'Relatório Consolidado Geral de Férias',
      desc: 'Quadro geral com todos os policiais da unidade, todas as equipes e todas as modalidades para o exercício selecionado.',
    },
    POR_EQUIPE: {
      titulo: 'Relatório Separado por Equipe',
      desc: 'Escala detalhada focada no efetivo do plantão selecionado para envio e controle setorial.',
    },
    PENDENTES: {
      titulo: 'Relatório de Solicitações Pendentes',
      desc: 'Relação de todos os policiais penais cujos pedidos ainda aguardam homologação da Diretoria.',
    },
    CONFLITOS: {
      titulo: 'Relatório de Conflitos e Ajustes de Efetivo',
      desc: 'Apontamento de períodos com sobreposição ou excesso de pedidos que demandam remanejamento.',
    },
    APROVADAS: {
      titulo: 'Relatório Oficial de Férias Aprovadas',
      desc: 'Escala final e homologada pronta para publicação em Boletim Interno ou encaminhamento ao DRHU / SAP.',
    },
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner Superior dos Relatórios SAP */}
      <div className="bg-gradient-to-r from-navy-950 to-navy-900 text-white rounded-3xl p-6 sm:p-8 border border-navy-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-gold-500/20 text-gold-400 border border-gold-500/30 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <span>UNIDADE PRISIONAL</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Relatórios Oficiais para a SAP
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Gere relatórios institucionais consolidados, por equipe ou por situação funcional. Exporte para <b>planilhas Excel (.CSV)</b> ou emita o <b>documento oficial em PDF</b> para arquivo e encaminhamento.
          </p>
        </div>

        {/* Botões de Ação de Download */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-3 rounded-2xl shadow-lg transition active:scale-95"
            title="Baixar arquivo compatível com Microsoft Excel (ponto e vírgula, acentuação UTF-8 correta)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV (Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-500 text-navy-950 text-xs font-black px-5 py-3 rounded-2xl shadow-lg transition active:scale-95"
            title="Gerar PDF Oficial com cabeçalho institucional da SAP e paginação"
          >
            <Download className="w-4 h-4" />
            <span>Gerar PDF Oficial SAP</span>
          </button>
        </div>
      </div>

      {/* Painel de Seleção e Filtros */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo de Relatório */}
          <div>
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider mb-1.5">
              1. Tipo de Relatório:
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoRelatorio)}
              className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-300 rounded-2xl text-navy-950 outline-none focus:ring-2 focus:ring-navy-800"
            >
              <option value="CONSOLIDADO">Relatório Consolidado de Férias</option>
              <option value="POR_EQUIPE">Relatório Separado por Equipe</option>
              <option value="PENDENTES">Relatório de Solicitações Pendentes</option>
              <option value="CONFLITOS">Relatório de Conflitos e Ajustes</option>
              <option value="APROVADAS">Relatório de Férias Aprovadas</option>
            </select>
          </div>

          {/* Ano do Exercício */}
          <div>
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider mb-1.5">
              2. Ano de Exercício:
            </label>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-300 rounded-2xl text-navy-950 outline-none focus:ring-2 focus:ring-navy-800"
            >
              <option value={2026}>Exercício 2026</option>
              <option value={2027}>Exercício 2027</option>
            </select>
          </div>

          {/* Filtro de Equipe */}
          <div>
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider mb-1.5">
              3. Filtrar por Equipe:
            </label>
            <select
              value={equipeId}
              onChange={(e) => setEquipeId(e.target.value)}
              className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-300 rounded-2xl text-navy-950 outline-none focus:ring-2 focus:ring-navy-800"
            >
              <option value="TODAS">Todas as Equipes (Plantões 1 a 4)</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumo do Relatório Ativo */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-black text-navy-950 text-sm">{relatoriosDescricoes[tipo].titulo}</h4>
            <p className="text-slate-600 text-xs mt-0.5">{relatoriosDescricoes[tipo].desc}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registros Localizados</span>
            <span className="text-lg font-black text-navy-950">{dadosFiltrados.length}</span>
          </div>
        </div>

        {/* Preview da Tabela */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Pré-visualização do Relatório (Primeiras Linhas)
          </h4>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950 text-white font-bold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Matrícula</th>
                  <th className="py-2.5 px-3">Nome do Policial</th>
                  <th className="py-2.5 px-3">Equipe</th>
                  <th className="py-2.5 px-3">Modalidade</th>
                  <th className="py-2.5 px-3">Períodos de Férias</th>
                  <th className="py-2.5 px-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum registro encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  dadosFiltrados.slice(0, 15).map(sol => (
                    <tr key={sol.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">{sol.policial?.matricula || '-'}</td>
                      <td className="py-2 px-3 font-semibold text-navy-950">{sol.policial?.nomeCompleto || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{sol.equipe?.nome || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{sol.modalidade.replace('_', ' ')}</td>
                      <td className="py-2 px-3">
                        <div className="space-y-0.5">
                          {sol.periodos.map((p, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700">
                              {formatarDataBR(p.dataInicio)} a {formatarDataBR(p.dataFim)} ({p.quantidadeDias}d)
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          sol.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-800' :
                          sol.status === 'PENDENTE' ? 'bg-amber-100 text-amber-800' :
                          sol.status === 'DEVOLVIDA' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {sol.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {dadosFiltrados.length > 15 && (
            <p className="text-[11px] text-slate-400 text-right">
              Mostrando 15 de {dadosFiltrados.length} registros. Exporte para CSV ou PDF para visualizar a totalidade.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

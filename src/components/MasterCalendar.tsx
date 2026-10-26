import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Filter, 
  Users, 
  List, 
  Grid, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X,
  Search
} from 'lucide-react';
import { SolicitacaoFerias, Equipe, Perfil } from '../types';
import { formatarDataBR } from '../services/conflictEngine';

interface MasterCalendarProps {
  solicitacoes: SolicitacaoFerias[];
  equipes: Equipe[];
  perfis: Perfil[];
}

export const MasterCalendar: React.FC<MasterCalendarProps> = ({
  solicitacoes,
  equipes,
  perfis,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // Inicia em Março de 2026
  const [selectedEquipeId, setSelectedEquipeId] = useState<string>('TODAS');
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'list'>('month');
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    items: {
      solicitacao: SolicitacaoFerias;
      policial: Perfil;
      equipe: Equipe;
      status: string;
    }[];
  } | null>(null);

  // Busca textual para a visualização acessível em lista
  const [searchList, setSearchList] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Dias do mês atual
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Mapa de afastamentos por data (YYYY-MM-DD)
  const mapaDiario = useMemo(() => {
    const map = new Map<string, {
      aprovados: { sol: SolicitacaoFerias; pol: Perfil; eq: Equipe }[];
      pendentes: { sol: SolicitacaoFerias; pol: Perfil; eq: Equipe }[];
      devolvidos: { sol: SolicitacaoFerias; pol: Perfil; eq: Equipe }[];
    }>();

    (solicitacoes || []).forEach(sol => {
      if (!sol) return;
      if (sol.status === 'REJEITADA' || sol.status === 'CANCELADA') return;
      if (selectedEquipeId !== 'TODAS' && sol.equipeId !== selectedEquipeId) return;

      const pol = sol.policial || (perfis || []).find(p => p.id === sol.policialId);
      const eq = sol.equipe || (equipes || []).find(e => e.id === sol.equipeId);
      if (!pol || !eq) return;

      (sol.periodos || []).forEach(p => {
        if (!p || !p.dataInicio || !p.dataFim) return;

        const curr = new Date(p.dataInicio + 'T00:00:00');
        const end = new Date(p.dataFim + 'T00:00:00');

        while (curr <= end) {
          const dStr = curr.toISOString().split('T')[0];
          if (!map.has(dStr)) {
            map.set(dStr, { aprovados: [], pendentes: [], devolvidos: [] });
          }

          const entry = map.get(dStr)!;
          const item = { sol, pol, eq };

          if (sol.status === 'APROVADA') entry.aprovados.push(item);
          else if (sol.status === 'PENDENTE') entry.pendentes.push(item);
          else if (sol.status === 'DEVOLVIDA') entry.devolvidos.push(item);

          curr.setDate(curr.getDate() + 1);
        }
      });
    });

    return map;
  }, [solicitacoes, selectedEquipeId, perfis, equipes]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dados = mapaDiario.get(dStr);

    const items: any[] = [];
    if (dados) {
      dados.aprovados.forEach(i => items.push({ solicitacao: i.sol, policial: i.pol, equipe: i.eq, status: 'APROVADA' }));
      dados.pendentes.forEach(i => items.push({ solicitacao: i.sol, policial: i.pol, equipe: i.eq, status: 'PENDENTE' }));
      dados.devolvidos.forEach(i => items.push({ solicitacao: i.sol, policial: i.pol, equipe: i.eq, status: 'DEVOLVIDA' }));
    }

    setSelectedDayInfo({
      dateStr: dStr,
      items,
    });
  };

  // Linhas para a Lista Acessível
  const listaAcessivel = useMemo(() => {
    let filtradas = solicitacoes.filter(s => s.anoExercicio === year);

    if (selectedEquipeId !== 'TODAS') {
      filtradas = filtradas.filter(s => s.equipeId === selectedEquipeId);
    }

    if (searchList.trim()) {
      const q = searchList.toLowerCase();
      filtradas = filtradas.filter(s => 
        s.policial?.nomeCompleto.toLowerCase().includes(q) ||
        s.policial?.matricula.toLowerCase().includes(q)
      );
    }

    return filtradas;
  }, [solicitacoes, year, selectedEquipeId, searchList]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Controles Principais e Filtros */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navegação de Mês */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white rounded-xl text-slate-700 hover:text-navy-950 transition shadow-sm"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-black text-navy-950 text-base px-4 min-w-[170px] text-center">
              {mesesNomes[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white rounded-xl text-slate-700 hover:text-navy-950 transition shadow-sm"
              title="Próximo Mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Seletor Rápido de Ano */}
          <select
            value={year}
            onChange={(e) => setCurrentDate(new Date(Number(e.target.value), month, 1))}
            className="bg-slate-100 border border-slate-200 text-xs font-bold text-navy-950 px-3 py-2.5 rounded-2xl outline-none"
          >
            <option value={2026}>Exercício 2026</option>
            <option value={2027}>Exercício 2027</option>
          </select>
        </div>

        {/* Filtro por Equipe & Alternância de Visualização */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedEquipeId}
              onChange={(e) => setSelectedEquipeId(e.target.value)}
              className="bg-transparent text-xs font-bold text-navy-950 outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as 4 Equipes</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </div>

          {/* Botões Grid Mensal / Lista Acessível */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'month' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grade Mensal</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'list' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Acessível</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legenda de Cores Oficial */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-700">
        <span className="font-bold text-navy-950 uppercase text-[10px] tracking-wider">Legenda Oficial:</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span>Disponível / Sem Afastamentos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span>Solicitação Pendente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>Férias Aprovadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600"></span>
            <span className="font-bold text-rose-700">Conflito de Efetivo (Limite Esgotado)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>Devolvida para Correção</span>
          </div>
        </div>
      </div>

      {/* Visualização 1: Grade Mensal */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 overflow-hidden">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-black text-navy-950 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, idx) => (
              <div key={idx} className="py-2 bg-slate-50 rounded-xl text-slate-600">
                {dia}
              </div>
            ))}
          </div>

          {/* Grid dos Dias do Mês */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-20 sm:h-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100" />
            ))}

            {/* Dias reais do mês */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dataInfo = mapaDiario.get(dStr);

              const aprovadosCount = dataInfo?.aprovados.length || 0;
              const pendentesCount = dataInfo?.pendentes.length || 0;
              const devolvidosCount = dataInfo?.devolvidos.length || 0;
              const totalAfastados = aprovadosCount;

              // Limite da equipe selecionada (ou 3 como padrão se TODAS)
              const equipeAlvo = selectedEquipeId !== 'TODAS'
                ? equipes.find(e => e.id === selectedEquipeId)
                : null;
              const limite = equipeAlvo?.limiteAfastamentosSimultaneos || 1;

              const isConflito = aprovadosCount >= limite;
              const temMovimento = aprovadosCount > 0 || pendentesCount > 0 || devolvidosCount > 0;

              // Determinar estilo do card de dia
              let cardBg = 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70';
              let badgeColor = 'bg-slate-200 text-slate-700';

              if (isConflito) {
                cardBg = 'bg-rose-50/90 border-rose-300 hover:bg-rose-100';
                badgeColor = 'bg-rose-600 text-white font-black';
              } else if (aprovadosCount > 0) {
                cardBg = 'bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100';
                badgeColor = 'bg-emerald-600 text-white font-bold';
              } else if (pendentesCount > 0) {
                cardBg = 'bg-amber-50/70 border-amber-300 hover:bg-amber-100';
                badgeColor = 'bg-amber-500 text-white font-bold';
              } else if (devolvidosCount > 0) {
                cardBg = 'bg-blue-50/70 border-blue-300 hover:bg-blue-100';
                badgeColor = 'bg-blue-600 text-white font-bold';
              }

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`h-20 sm:h-24 p-2 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${cardBg}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-navy-950">{day}</span>
                    {temMovimento && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                        {aprovadosCount}/{limite}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {aprovadosCount > 0 && (
                      <div className="text-[9px] text-emerald-800 font-bold truncate">
                        🟢 {aprovadosCount} aprovado(s)
                      </div>
                    )}
                    {pendentesCount > 0 && (
                      <div className="text-[9px] text-amber-800 font-medium truncate">
                        🟡 {pendentesCount} pendente(s)
                      </div>
                    )}
                    {isConflito && (
                      <div className="text-[8px] bg-rose-600 text-white font-black px-1 rounded truncate">
                        CONFLITO
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visualização 2: Lista Acessível */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-navy-950">Visualização em Lista Acessível</h3>
              <p className="text-xs text-slate-500">Consulte todas as solicitações registradas para {year}</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula..."
                value={searchList}
                onChange={(e) => setSearchList(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-3">Matrícula</th>
                  <th className="py-3 px-3">Policial Penal</th>
                  <th className="py-3 px-3">Equipe</th>
                  <th className="py-3 px-3">Modalidade</th>
                  <th className="py-3 px-3">Períodos de Férias</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listaAcessivel.map(sol => (
                  <tr key={sol.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{sol.policial?.matricula || '-'}</td>
                    <td className="py-3 px-3 font-semibold text-navy-950">{sol.policial?.nomeCompleto || '-'}</td>
                    <td className="py-3 px-3 text-slate-600">{sol.equipe?.nome || '-'}</td>
                    <td className="py-3 px-3 text-slate-600">{sol.modalidade.replace('_', ' ')}</td>
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        {sol.periodos.map((p, idx) => (
                          <div key={idx} className="text-[11px] text-slate-700">
                            {formatarDataBR(p.dataInicio)} a {formatarDataBR(p.dataFim)} ({p.quantidadeDias}d)
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        sol.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-800' :
                        sol.status === 'PENDENTE' ? 'bg-amber-100 text-amber-800' :
                        sol.status === 'DEVOLVIDA' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sol.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detalhado ao Clicar no Dia */}
      {selectedDayInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">
                  Detalhes do Dia: {formatarDataBR(selectedDayInfo.dateStr)}
                </h3>
                <p className="text-xs text-slate-300">Afastamentos e solicitações para esta data</p>
              </div>
              <button 
                onClick={() => setSelectedDayInfo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedDayInfo.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Nenhum policial afastado ou com solicitação para este dia.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayInfo.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-navy-950">{item.policial.nomeCompleto}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          item.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'PENDENTE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Matrícula: {item.policial.matricula}</span>
                        <span>•</span>
                        <span>{item.equipe.nome}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="text-xs font-bold text-navy-900 hover:bg-slate-200 px-4 py-2 rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

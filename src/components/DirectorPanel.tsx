import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  AlertTriangle, 
  Users, 
  FileText, 
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  History,
  ShieldAlert,
  KeyRound,
  Shield
} from 'lucide-react';
import { SolicitacaoFerias, Equipe, Perfil, HistoricoAuditoria } from '../types';
import { formatarDataBR, analisarConflitosSolicitacao } from '../services/conflictEngine';
import { aprovarSolicitacaoTransacional, decidirSolicitacao } from '../services/dataService';
import { DirectorModal } from './DirectorModal';

interface DirectorPanelProps {
  currentUser: Perfil;
  solicitacoes: SolicitacaoFerias[];
  equipes: Equipe[];
  perfis: Perfil[];
  historico: HistoricoAuditoria[];
  onDataUpdated: () => void;
}

export const DirectorPanel: React.FC<DirectorPanelProps> = ({
  currentUser,
  solicitacoes,
  equipes,
  perfis,
  historico,
  onDataUpdated,
}) => {
  const [filterEquipe, setFilterEquipe] = useState('TODAS');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'PENDENTE' | 'APROVADA' | 'DEVOLVIDA' | 'REJEITADA'>('PENDENTE');
  const [search, setSearch] = useState('');
  
  // Modais de Ação
  const [modalAcao, setModalAcao] = useState<{
    solicitacao: SolicitacaoFerias;
    tipo: 'APROVAR' | 'DEVOLVER' | 'REJEITAR';
  } | null>(null);

  const [justificativa, setJustificativa] = useState('');
  const [processando, setProcessando] = useState(false);
  const [mensagemFeedback, setMensagemFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [modalDiretorOpen, setModalDiretorOpen] = useState(false);

  // Indicadores
  const totalPoliciais = perfis.filter(p => p.papel === 'policial').length;
  const pendentesCount = solicitacoes.filter(s => s.status === 'PENDENTE').length;
  const aprovadasCount = solicitacoes.filter(s => s.status === 'APROVADA').length;
  const rejeitadasCount = solicitacoes.filter(s => s.status === 'REJEITADA').length;
  const devolvidasCount = solicitacoes.filter(s => s.status === 'DEVOLVIDA').length;

  // Filtragem da Fila
  const solicitacoesFiltradas = solicitacoes.filter(s => {
    if (filterEquipe !== 'TODAS' && s.equipeId !== filterEquipe) return false;
    if (filterStatus !== 'TODOS' && s.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nome = s.policial?.nomeCompleto.toLowerCase() || '';
      const mat = s.policial?.matricula.toLowerCase() || '';
      return nome.includes(q) || mat.includes(q);
    }
    return true;
  });

  const handleOpenModal = (sol: SolicitacaoFerias, tipo: 'APROVAR' | 'DEVOLVER' | 'REJEITAR') => {
    setModalAcao({ solicitacao: sol, tipo });
    setJustificativa(tipo === 'APROVAR' ? 'Aprovado conforme escala e limites operacionais da unidade.' : '');
    setMensagemFeedback(null);
  };

  const handleConfirmarAcao = async () => {
    if (!modalAcao) return;
    setProcessando(true);
    setMensagemFeedback(null);

    const { solicitacao, tipo } = modalAcao;

    try {
      if (tipo === 'APROVAR') {
        const res = await aprovarSolicitacaoTransacional(
          solicitacao.id,
          currentUser.id,
          justificativa || 'Aprovada pela Direção'
        );

        if (!res.sucesso) {
          setMensagemFeedback({ tipo: 'erro', texto: res.mensagem });
          setProcessando(false);
          return;
        }

        setMensagemFeedback({ tipo: 'ok', texto: res.mensagem });
      } else {
        const novoStatus = tipo === 'DEVOLVER' ? 'DEVOLVIDA' : 'REJEITADA';
        if (!justificativa.trim()) {
          setMensagemFeedback({ tipo: 'erro', texto: 'A justificativa é obrigatória para devolução ou rejeição.' });
          setProcessando(false);
          return;
        }

        const res = await decidirSolicitacao(
          solicitacao.id,
          currentUser.id,
          novoStatus,
          justificativa
        );

        if (!res.sucesso) {
          setMensagemFeedback({ tipo: 'erro', texto: res.mensagem });
          setProcessando(false);
          return;
        }

        setMensagemFeedback({ tipo: 'ok', texto: res.mensagem });
      }

      setTimeout(() => {
        setModalAcao(null);
        onDataUpdated();
      }, 1200);
    } catch (err: any) {
      setMensagemFeedback({ tipo: 'erro', texto: `Erro na operação: ${err.message}` });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Identificação e Configuração da Direção */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-850 text-white rounded-3xl p-5 sm:p-6 border border-navy-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400 flex-shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-gold-400 bg-gold-400/10 px-2.5 py-0.5 rounded-full border border-gold-400/20">
                Direção da Unidade
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Matrícula: <strong className="text-white">{currentUser.matricula}</strong>
              </span>
            </div>
            <h2 className="text-lg font-black text-white">{currentUser.nomeCompleto}</h2>
            <p className="text-xs text-slate-300">
              Acesso total com poderes de homologação do plano anual de férias da unidade.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalDiretorOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gold-400 hover:bg-gold-300 text-navy-950 font-black text-xs shadow-md transition flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <KeyRound className="w-4 h-4" />
          <span>Alterar Nome, Matrícula e Senha</span>
        </button>
      </div>

      {/* Cards de Métricas e Indicadores da Direção */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Policiais</span>
          <div className="text-2xl font-black text-navy-950">{totalPoliciais}</div>
          <span className="text-[11px] text-slate-500 font-medium">4 equipes ativas</span>
        </div>

        <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Aguardando Análise</span>
          <div className="text-2xl font-black text-amber-800">{pendentesCount}</div>
          <span className="text-[11px] text-amber-900/80 font-medium">Pendentes de parecer</span>
        </div>

        <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Homologadas</span>
          <div className="text-2xl font-black text-emerald-800">{aprovadasCount}</div>
          <span className="text-[11px] text-emerald-900/80 font-medium">Férias aprovadas</span>
        </div>

        <div className="bg-blue-50/70 p-5 rounded-3xl border border-blue-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Devolvidas</span>
          <div className="text-2xl font-black text-blue-800">{devolvidasCount}</div>
          <span className="text-[11px] text-blue-900/80 font-medium">Aguardando correção</span>
        </div>

        <div className="bg-rose-50/70 p-5 rounded-3xl border border-rose-200/80 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Rejeitadas</span>
          <div className="text-2xl font-black text-rose-800">{rejeitadasCount}</div>
          <span className="text-[11px] text-rose-900/80 font-medium">Inviáveis no efetivo</span>
        </div>
      </div>

      {/* Fila de Análise e Gestão de Solicitações */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-lg font-black text-navy-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold-600" />
              Fila de Decisão da Diretoria
            </h3>
            <p className="text-xs text-slate-500">Revise o efetivo, aprove, devolva para ajuste ou indefira pedidos</p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filtro Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-100 border border-slate-200 text-xs font-bold text-navy-950 px-3 py-2 rounded-2xl outline-none"
            >
              <option value="PENDENTE">Filtrar: Pendentes</option>
              <option value="APROVADA">Filtrar: Aprovadas</option>
              <option value="DEVOLVIDA">Filtrar: Devolvidas</option>
              <option value="REJEITADA">Filtrar: Rejeitadas</option>
              <option value="TODOS">Todos os Status</option>
            </select>

            {/* Filtro Equipe */}
            <select
              value={filterEquipe}
              onChange={(e) => setFilterEquipe(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-xs font-bold text-navy-950 px-3 py-2 rounded-2xl outline-none"
            >
              <option value="TODAS">Todas as Equipes</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>

            {/* Busca Nome/Matrícula */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Policial ou matrícula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-2xl focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tabela / Cards de Solicitações */}
        {solicitacoesFiltradas.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">Nenhuma solicitação encontrada para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {solicitacoesFiltradas.map(sol => {
              const eq = equipes.find(e => e.id === sol.equipeId);
              
              // Pré-verificação de conflito para dar visibilidade imediata ao diretor
              const analise = eq ? analisarConflitosSolicitacao(
                eq,
                sol.periodos.map(p => ({ dataInicio: p.dataInicio, dataFim: p.dataFim })),
                solicitacoes,
                sol.id
              ) : null;

              return (
                <div
                  key={sol.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-navy-950">
                          {sol.policial?.nomeCompleto || 'Policial Desconhecido'}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {sol.policial?.matricula || '-'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                        <span>{sol.equipe?.nome}</span>
                        <span>•</span>
                        <span>Modalidade: <b>{sol.modalidade.replace('_', ' ')}</b></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Badge de Conflito */}
                      {analise && analise.temConflito && (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 rounded-full text-[10px] font-black">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Conflito de Efetivo
                        </span>
                      )}

                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        sol.status === 'APROVADA' ? 'bg-emerald-100 text-emerald-800' :
                        sol.status === 'PENDENTE' ? 'bg-amber-100 text-amber-900' :
                        sol.status === 'DEVOLVIDA' ? 'bg-blue-100 text-blue-900' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {sol.status}
                      </span>
                    </div>
                  </div>

                  {/* Períodos Solicitados */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                    {sol.periodos.map((p, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Período {p.numeroPeriodo}</span>
                        <span className="font-bold text-navy-900">
                          {formatarDataBR(p.dataInicio)} a {formatarDataBR(p.dataFim)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">({p.quantidadeDias} dias corridos)</span>
                      </div>
                    ))}
                  </div>

                  {/* Alerta de Conflito em Detalhe */}
                  {analise && analise.temConflito && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 leading-relaxed">
                      <b>Atenção da Direção:</b> {analise.mensagem}
                    </div>
                  )}

                  {/* Justificativa ou Observação do Policial */}
                  {sol.observacaoPolicial && (
                    <p className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200 italic">
                      " {sol.observacaoPolicial} "
                    </p>
                  )}

                  {/* Ações da Diretoria */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(sol, 'DEVOLVER')}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Devolver p/ Correção
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal(sol, 'REJEITAR')}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeitar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal(sol, 'APROVAR')}
                      className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Homologar / Aprovar Férias
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico Recente de Decisões / Auditoria */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-black text-navy-950 flex items-center gap-2">
          <History className="w-4 h-4 text-gold-600" />
          Registro de Auditoria de Decisões
        </h3>

        {historico.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Nenhuma decisão registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Ação</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Novo Status</th>
                  <th className="py-2.5 px-3">Justificativa Registrada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historico.slice(0, 10).map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {new Date(h.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-navy-950">{h.acao}</td>
                    <td className="py-2.5 px-3 text-slate-700">{h.responsavelNome || 'Diretoria'}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-xs">{h.novoStatus}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{h.justificativa || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Ação da Diretoria */}
      {modalAcao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              modalAcao.tipo === 'APROVAR' ? 'bg-emerald-700' :
              modalAcao.tipo === 'DEVOLVER' ? 'bg-blue-700' : 'bg-rose-700'
            }`}>
              <div>
                <h3 className="font-black text-base">
                  {modalAcao.tipo === 'APROVAR' ? 'Homologar Férias' :
                   modalAcao.tipo === 'DEVOLVER' ? 'Devolver Solicitação para Correção' : 'Rejeitar Solicitação'}
                </h3>
                <p className="text-xs text-white/80">
                  {modalAcao.solicitacao.policial?.nomeCompleto} ({modalAcao.solicitacao.policial?.matricula})
                </p>
              </div>
              <button onClick={() => setModalAcao(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {mensagemFeedback && (
                <div className={`p-3.5 rounded-2xl text-xs font-semibold ${
                  mensagemFeedback.tipo === 'ok'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}>
                  {mensagemFeedback.texto}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">
                  Justificativa / Parecer da Direção {modalAcao.tipo !== 'APROVAR' && <span className="text-rose-600">*</span>}:
                </label>
                <textarea
                  rows={3}
                  required={modalAcao.tipo !== 'APROVAR'}
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder={
                    modalAcao.tipo === 'DEVOLVER'
                      ? 'Explique o motivo da devolução (ex: conflito com escala de transferência, escolher novo mês)...'
                      : modalAcao.tipo === 'REJEITAR'
                      ? 'Informe os fundamentos da negativa...'
                      : 'Parecer da aprovação...'
                  }
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-navy-800 outline-none"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                Esta decisão será registrada permanentemente no histórico de auditoria funcional com a identificação do responsável e data/hora.
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAcao(null)}
                className="text-xs font-bold text-slate-600 hover:bg-slate-200 px-4 py-2 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processando}
                onClick={handleConfirmarAcao}
                className={`text-xs font-black text-white px-5 py-2 rounded-xl shadow-md transition ${
                  modalAcao.tipo === 'APROVAR' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  modalAcao.tipo === 'DEVOLVER' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processando ? 'Processando Decisão...' : 'Confirmar Decisão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Alterar Nome, Matrícula e Senha da Direção */}
      <DirectorModal
        isOpen={modalDiretorOpen}
        onClose={() => setModalDiretorOpen(false)}
        diretorPerfil={currentUser}
        onDataUpdated={onDataUpdated}
      />
    </div>
  );
};

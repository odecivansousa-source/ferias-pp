import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Send, 
  RotateCcw, 
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { Perfil, Equipe, SolicitacaoFerias, ModalidadeFerias, ConfiguracaoFerias } from '../types';
import { 
  validarPeriodosModalidade, 
  calcularDataFim, 
  analisarConflitosSolicitacao, 
  formatarDataBR 
} from '../services/conflictEngine';
import { createSolicitacao, deleteSolicitacao } from '../services/dataService';

interface VacationWizardProps {
  currentUser: Perfil;
  userTeam?: Equipe;
  allSolicitacoes: SolicitacaoFerias[];
  config: ConfiguracaoFerias;
  onSolicitacaoCreated: () => void;
}

export const VacationWizard: React.FC<VacationWizardProps> = ({
  currentUser,
  userTeam,
  allSolicitacoes,
  config,
  onSolicitacaoCreated,
}) => {
  const [modalidade, setModalidade] = useState<ModalidadeFerias>('30_DIAS');
  
  // Períodos selecionados
  const [periodo1, setPeriodo1] = useState<{ ini: string; fim: string }>({ ini: '', fim: '' });
  const [periodo2, setPeriodo2] = useState<{ ini: string; fim: string }>({ ini: '', fim: '' });
  const [periodo3, setPeriodo3] = useState<{ ini: string; fim: string }>({ ini: '', fim: '' });

  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');

  // Auto-calcular data fim ao selecionar início com base na modalidade
  const handleIniChange = (numPeriodo: number, dataIni: string) => {
    let dias = 30;
    if (modalidade === '2x15_DIAS') dias = 15;
    if (modalidade === '3x10_DIAS') dias = 10;

    const dataFimCalculada = calcularDataFim(dataIni, dias);

    if (numPeriodo === 1) setPeriodo1({ ini: dataIni, fim: dataFimCalculada });
    if (numPeriodo === 2) setPeriodo2({ ini: dataIni, fim: dataFimCalculada });
    if (numPeriodo === 3) setPeriodo3({ ini: dataIni, fim: dataFimCalculada });
  };

  // Montar array de períodos ativos
  const getPeriodosAtivos = () => {
    if (modalidade === '30_DIAS') {
      return [{ dataInicio: periodo1.ini, dataFim: periodo1.fim, dias: 30, num: 1 }];
    }
    if (modalidade === '2x15_DIAS') {
      return [
        { dataInicio: periodo1.ini, dataFim: periodo1.fim, dias: 15, num: 1 },
        { dataInicio: periodo2.ini, dataFim: periodo2.fim, dias: 15, num: 2 },
      ];
    }
    return [
      { dataInicio: periodo1.ini, dataFim: periodo1.fim, dias: 10, num: 1 },
      { dataInicio: periodo2.ini, dataFim: periodo2.fim, dias: 10, num: 2 },
      { dataInicio: periodo3.ini, dataFim: periodo3.fim, dias: 10, num: 3 },
    ];
  };

  // Análise de conflito em tempo real
  const periodosAtivos = getPeriodosAtivos();
  const todosPreenchidos = periodosAtivos.every(p => p.dataInicio && p.dataFim);
  const periodosComDatas = periodosAtivos.filter(p => p.dataInicio && p.dataFim);

  const validacaoEstrutural = todosPreenchidos
    ? validarPeriodosModalidade(
        modalidade,
        periodosAtivos.map(p => ({ dataInicio: p.dataInicio, dataFim: p.dataFim }))
      )
    : { valido: true, mensagem: '' };

  const analiseConflito = (userTeam && periodosComDatas.length > 0)
    ? analisarConflitosSolicitacao(
        userTeam,
        periodosComDatas.map(p => ({ dataInicio: p.dataInicio, dataFim: p.dataFim })),
        allSolicitacoes,
        undefined,
        currentUser.id
      )
    : null;

  const [modalDespachoAberto, setModalDespachoAberto] = useState(true);

  // Minhas solicitações anteriores (identificação segura por ID ou Matrícula funcional)
  const isMinhaSolicitacao = (s: SolicitacaoFerias) => {
    if (s.policialId && currentUser.id && s.policialId === currentUser.id) return true;
    const matS = (s.policial?.matricula || '').trim().toUpperCase();
    const matUser = (currentUser.matricula || '').trim().toUpperCase();
    if (matS && matUser && matS === matUser) return true;
    return false;
  };

  const minhasSolicitacoes = allSolicitacoes.filter(isMinhaSolicitacao);
  const solicitacaoDevolvidaOuRejeitada = minhasSolicitacoes.find(
    s => s.status === 'DEVOLVIDA' || s.status === 'REJEITADA'
  );

  const handleDispensarDevolvida = async () => {
    if (!solicitacaoDevolvidaOuRejeitada) return;
    try {
      await deleteSolicitacao(solicitacaoDevolvidaOuRejeitada.id);
      onSolicitacaoCreated();
    } catch (e) {
      console.warn('Erro ao dispensar solicitação devolvida:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');
    setSucessoMsg('');

    if (!userTeam) {
      setErroMsg('Erro: Nenhuma equipe associada ao seu cadastro. Contate a administração.');
      return;
    }

    if (!validacaoEstrutural.valido) {
      setErroMsg(validacaoEstrutural.mensagem);
      return;
    }

    setEnviando(true);
    try {
      // Se havia uma solicitação anterior devolvida para ajuste ou rejeitada, remove para o policial enviar novamente
      if (solicitacaoDevolvidaOuRejeitada) {
        try {
          await deleteSolicitacao(solicitacaoDevolvidaOuRejeitada.id);
        } catch (e) {
          console.warn('Erro ao remover requerimento anterior devolvido:', e);
        }
      }

      await createSolicitacao({
        policialId: currentUser.id,
        equipeId: userTeam.id,
        anoExercicio: config.anoExercicio,
        modalidade,
        status: 'PENDENTE',
        observacaoPolicial: observacoes,
        periodos: periodosAtivos.map(p => ({
          id: '',
          numeroPeriodo: p.num,
          dataInicio: p.dataInicio,
          dataFim: p.dataFim,
          quantidadeDias: p.dias,
        })),
      });

      setSucessoMsg('Novo requerimento de férias enviado com sucesso para análise da Direção da Unidade!');
      // Limpar formulário
      setPeriodo1({ ini: '', fim: '' });
      setPeriodo2({ ini: '', fim: '' });
      setPeriodo3({ ini: '', fim: '' });
      setObservacoes('');
      onSolicitacaoCreated();
    } catch (err: any) {
      setErroMsg(`Falha ao registrar solicitação: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Modal Despacho da Direção - Notificação Imediata para o Policial */}
      {solicitacaoDevolvidaOuRejeitada && modalDespachoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA' ? 'bg-blue-700' : 'bg-rose-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  {solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA' ? (
                    <RotateCcw className="w-5 h-5 text-white" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-base">Despacho da Direção da Unidade</h3>
                  <p className="text-xs text-white/80">Mensagem Oficial da Diretoria</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDespachoAberto(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-600">
                  Policial: <b className="text-navy-950">{currentUser.nomeCompleto}</b> ({currentUser.matricula})
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA'
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'bg-rose-100 text-rose-900 border border-rose-200'
                }`}>
                  {solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA'
                    ? 'Devolvido para Adequação'
                    : 'Requerimento Indeferido'}
                </span>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                A Direção da Unidade analisou seu plano de férias anterior referente a{' '}
                <b>
                  {solicitacaoDevolvidaOuRejeitada.periodos.map(
                    p => `${formatarDataBR(p.dataInicio)} a ${formatarDataBR(p.dataFim)}`
                  ).join(', ')}
                </b>{' '}
                e encaminhou o seguinte parecer:
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-navy-950 text-xs shadow-inner leading-relaxed">
                <span className="font-bold text-amber-900 block mb-1">💬 Parecer / Justificativa da Direção:</span>
                <p className="text-slate-800 text-xs font-semibold italic">
                  "{solicitacaoDevolvidaOuRejeitada.justificativaDecisao || 'Sem justificativa informada.'}"
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                ℹ️ <b>Orientações:</b> O pedido anterior já foi liberado do painel da Direção. Escolha novas datas no formulário e clique em <b>"Submeter Solicitação de Férias"</b> para enviar novamente.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalDespachoAberto(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl font-black text-xs text-white bg-navy-950 hover:bg-navy-900 shadow-md transition"
                >
                  Entendido! Escolher Novas Datas Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Banner de Boas-vindas e Resumo Funcional */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-navy-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-gold-500/20 text-gold-300 border border-gold-500/30 px-3 py-1 rounded-full text-xs font-bold mb-3">
              <span>Ano de Exercício: {config.anoExercicio}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Plano de Férias do Policial Penal
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Olá, <b>{currentUser.nomeCompleto}</b>. Escolha a modalidade de sua preferência e defina os períodos desejados. O sistema valida automaticamente o limite de efetivo da <b>{userTeam?.nome || 'sua equipe'}</b>.
            </p>
          </div>

          <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl p-4 text-center min-w-[150px]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Vagas por Equipe</span>
            <span className="text-2xl font-black text-gold-400">
              {userTeam?.limiteAfastamentosSimultaneos || 1}
            </span>
            <span className="text-[11px] text-slate-300 block">simultânea</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Solicitação */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-navy-950 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gold-600" />
                  Nova Solicitação de Férias
                </h3>
                <p className="text-xs text-slate-500">Selecione uma modalidade e informe as datas</p>
              </div>
            </div>

            {sucessoMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Sucesso!</p>
                  <p className="mt-0.5">{sucessoMsg}</p>
                </div>
              </div>
            )}

            {/* Notificação / Mensagem da Direção da Unidade para Reenvio */}
            {solicitacaoDevolvidaOuRejeitada && !sucessoMsg && (
              <div className={`p-5 rounded-3xl border text-xs space-y-3 animate-fadeIn shadow-sm ${
                solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA'
                  ? 'bg-blue-50/95 border-blue-300 text-blue-950'
                  : 'bg-rose-50/95 border-rose-300 text-rose-950'
              }`}>
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-2xl flex-shrink-0 mt-0.5 ${
                    solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA' ? (
                      <RotateCcw className="w-5 h-5 text-blue-700" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-700" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-sm">
                        {solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA'
                          ? 'Mensagem da Direção: Requerimento Devolvido para Ajuste'
                          : 'Mensagem da Direção: Requerimento Anterior Não Aprovado'}
                      </p>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        solicitacaoDevolvidaOuRejeitada.status === 'DEVOLVIDA'
                          ? 'bg-blue-200 text-blue-900 border border-blue-300'
                          : 'bg-rose-200 text-rose-900 border border-rose-300'
                      }`}>
                        Novo Envio Necessário
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed">
                      A Direção da Unidade analisou o seu requerimento anterior de{' '}
                      <b>{solicitacaoDevolvidaOuRejeitada.periodos.map(p => `${formatarDataBR(p.dataInicio)} a ${formatarDataBR(p.dataFim)}`).join(', ')}</b>{' '}
                      e encaminhou o seguinte parecer:
                    </p>

                    <div className="p-3.5 rounded-2xl bg-white/95 border border-slate-200 text-xs font-semibold shadow-inner">
                      "{solicitacaoDevolvidaOuRejeitada.justificativaDecisao || 'Sem justificativa informada.'}"
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] font-bold text-slate-700">
                        👉 Selecione novas datas livres no formulário abaixo e clique em <b>"Submeter Solicitação de Férias"</b> para enviar novamente.
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setModalDespachoAberto(true)}
                          className="text-[11px] font-bold text-blue-800 hover:underline"
                        >
                          Ver Parecer Completo
                        </button>
                        <button
                          type="button"
                          onClick={handleDispensarDevolvida}
                          className="text-[11px] font-bold text-slate-500 hover:text-rose-700 underline"
                        >
                          Limpar este aviso
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Escolha da Modalidade */}
              <div>
                <label className="block text-xs font-black text-navy-950 uppercase tracking-wider mb-2.5">
                  1. Selecione a Modalidade de Férias
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalidade('30_DIAS')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      modalidade === '30_DIAS'
                        ? 'border-navy-900 bg-navy-50/80 shadow-md ring-2 ring-navy-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-black text-navy-950">30 Dias Corridos</span>
                    <span className="text-[11px] text-slate-500 block mt-1">1 único período integral de 30 dias</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalidade('2x15_DIAS')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      modalidade === '2x15_DIAS'
                        ? 'border-navy-900 bg-navy-50/80 shadow-md ring-2 ring-navy-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-black text-navy-950">2 Períodos de 15 Dias</span>
                    <span className="text-[11px] text-slate-500 block mt-1">Dois afastamentos de 15 dias cada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalidade('3x10_DIAS')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      modalidade === '3x10_DIAS'
                        ? 'border-navy-900 bg-navy-50/80 shadow-md ring-2 ring-navy-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="block text-xs font-black text-navy-950">3 Períodos de 10 Dias</span>
                    <span className="text-[11px] text-slate-500 block mt-1">Três afastamentos de 10 dias cada</span>
                  </button>
                </div>
              </div>

              {/* Campos de Períodos Dinâmicos */}
              <div className="space-y-4">
                <label className="block text-xs font-black text-navy-950 uppercase tracking-wider">
                  2. Defina os Períodos Desejados
                </label>

                {/* Período 1 */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-navy-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-navy-900 text-white flex items-center justify-center text-[10px]">1</span>
                      1º Período ({modalidade === '30_DIAS' ? '30 dias' : modalidade === '2x15_DIAS' ? '15 dias' : '10 dias'})
                    </span>
                    {periodo1.ini && periodo1.fim && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {modalidade === '30_DIAS' ? '30 dias' : modalidade === '2x15_DIAS' ? '15 dias' : '10 dias'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-600 mb-1">Data de Início:</span>
                      <input
                        type="date"
                        required
                        value={periodo1.ini}
                        onChange={(e) => handleIniChange(1, e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-600 mb-1">Data de Término (Auto):</span>
                      <input
                        type="date"
                        required
                        value={periodo1.fim}
                        onChange={(e) => setPeriodo1({ ...periodo1, fim: e.target.value })}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Feedback em tempo real do Período 1 */}
                  {periodo1.ini && periodo1.fim && analiseConflito && (() => {
                    const conflitosP1 = analiseConflito.colegasConflitantes.filter(c => c.periodoPropostoNumero === 1);
                    const temAprov = conflitosP1.some(c => c.status === 'APROVADA');
                    const temPend = conflitosP1.some(c => c.status === 'PENDENTE' || c.status === 'DEVOLVIDA');
                    if (temAprov) {
                      const c = conflitosP1.find(x => x.status === 'APROVADA');
                      return (
                        <div className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                          <span>Período indisponível: Vaga preenchida por {c?.nome} (Matrícula: {c?.matricula})</span>
                        </div>
                      );
                    }
                    if (temPend) {
                      const nomes = conflitosP1.map(x => `${x.nome} (${x.matricula})`).join(', ');
                      return (
                        <div className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                          <span>Sobreposição de escala com {nomes} (Requerimento sob análise)</span>
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                        <span>1º Período disponível na escala da equipe</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Período 2 (se modalidade exigir) */}
                {(modalidade === '2x15_DIAS' || modalidade === '3x10_DIAS') && (
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-navy-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-navy-900 text-white flex items-center justify-center text-[10px]">2</span>
                        2º Período ({modalidade === '2x15_DIAS' ? '15 dias' : '10 dias'})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 mb-1">Data de Início:</span>
                        <input
                          type="date"
                          required
                          value={periodo2.ini}
                          onChange={(e) => handleIniChange(2, e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
                        />
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 mb-1">Data de Término (Auto):</span>
                        <input
                          type="date"
                          required
                          value={periodo2.fim}
                          onChange={(e) => setPeriodo2({ ...periodo2, fim: e.target.value })}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
                        />
                      </div>
                    </div>

                    {/* Feedback em tempo real do Período 2 */}
                    {periodo2.ini && periodo2.fim && analiseConflito && (() => {
                      const conflitosP2 = analiseConflito.colegasConflitantes.filter(c => c.periodoPropostoNumero === 2);
                      const temAprov = conflitosP2.some(c => c.status === 'APROVADA');
                      const temPend = conflitosP2.some(c => c.status === 'PENDENTE' || c.status === 'DEVOLVIDA');
                      if (temAprov) {
                        const c = conflitosP2.find(x => x.status === 'APROVADA');
                        return (
                          <div className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                            <span>Período indisponível: Vaga preenchida por {c?.nome} (Matrícula: {c?.matricula})</span>
                          </div>
                        );
                      }
                      if (temPend) {
                        const nomes = conflitosP2.map(x => `${x.nome} (${x.matricula})`).join(', ');
                        return (
                          <div className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                            <span>Sobreposição de escala com {nomes} (Requerimento sob análise)</span>
                          </div>
                        );
                      }
                      return (
                        <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                          <span>2º Período disponível na escala da equipe</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Período 3 (se modalidade exigir) */}
                {modalidade === '3x10_DIAS' && (
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-navy-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-navy-900 text-white flex items-center justify-center text-[10px]">3</span>
                        3º Período (10 dias)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 mb-1">Data de Início:</span>
                        <input
                          type="date"
                          required
                          value={periodo3.ini}
                          onChange={(e) => handleIniChange(3, e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
                        />
                      </div>
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-600 mb-1">Data de Término (Auto):</span>
                        <input
                          type="date"
                          required
                          value={periodo3.fim}
                          onChange={(e) => setPeriodo3({ ...periodo3, fim: e.target.value })}
                          className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
                        />
                      </div>
                    </div>

                    {/* Feedback em tempo real do Período 3 */}
                    {periodo3.ini && periodo3.fim && analiseConflito && (() => {
                      const conflitosP3 = analiseConflito.colegasConflitantes.filter(c => c.periodoPropostoNumero === 3);
                      const temAprov = conflitosP3.some(c => c.status === 'APROVADA');
                      const temPend = conflitosP3.some(c => c.status === 'PENDENTE' || c.status === 'DEVOLVIDA');
                      if (temAprov) {
                        const c = conflitosP3.find(x => x.status === 'APROVADA');
                        return (
                          <div className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                            <span>Período indisponível: Vaga preenchida por {c?.nome} (Matrícula: {c?.matricula})</span>
                          </div>
                        );
                      }
                      if (temPend) {
                        const nomes = conflitosP3.map(x => `${x.nome} (${x.matricula})`).join(', ');
                        return (
                          <div className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                            <span>Sobreposição de escala com {nomes} (Requerimento sob análise)</span>
                          </div>
                        );
                      }
                      return (
                        <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                          <span>3º Período disponível na escala da equipe</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Radar de Conflito em Tempo Real */}
              {periodosComDatas.length > 0 && analiseConflito && (
                <div className={`p-5 rounded-3xl border text-xs leading-relaxed transition-all shadow-sm ${
                  analiseConflito.temAprovadas
                    ? 'bg-rose-50/95 border-rose-300 text-rose-950'
                    : analiseConflito.temPendentes
                    ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                    : 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
                }`}>
                  <div className="flex items-start gap-3">
                    {analiseConflito.temAprovadas ? (
                      <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700 flex-shrink-0 mt-0.5">
                        <ShieldAlert className="w-6 h-6 text-rose-600" />
                      </div>
                    ) : analiseConflito.temPendentes ? (
                      <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-sm">
                          {analiseConflito.temAprovadas
                            ? 'Período Indisponível (Férias Homologadas na Equipe)'
                            : analiseConflito.temPendentes
                            ? 'Notificação de Sobreposição de Escala na Equipe'
                            : 'Período Regularmente Disponível na Equipe'}
                        </p>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          analiseConflito.temAprovadas
                            ? 'bg-rose-200 text-rose-900 border border-rose-300'
                            : analiseConflito.temPendentes
                            ? 'bg-amber-200 text-amber-900 border border-amber-300'
                            : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                        }`}>
                          Diretriz Operacional: Limite de 1 servidor por escala
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed">
                        {analiseConflito.mensagem}
                      </p>

                      {/* Lista detalhada dos policiais da equipe em concorrência ou conflito */}
                      {analiseConflito.colegasConflitantes.length > 0 && (
                        <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/60">
                          <span className="text-[11px] font-black uppercase tracking-wider block text-slate-700">
                            Servidores da sua equipe com requerimentos no mesmo período:
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {analiseConflito.colegasConflitantes.map((c, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  c.status === 'APROVADA'
                                    ? 'bg-white border-rose-300 text-rose-950 shadow-sm'
                                    : 'bg-white border-amber-300 text-amber-950 shadow-sm'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.status === 'APROVADA' ? 'bg-rose-600' : 'bg-amber-500'}`} />
                                  <span className="font-black text-xs">{c.nome}</span>
                                  <span className="text-[10px] bg-slate-100 font-mono font-bold px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                    Matrícula: {c.matricula}
                                  </span>
                                </div>
                                <div className="text-left sm:text-right text-xs">
                                  <span className="font-bold block text-navy-950">
                                    {formatarDataBR(c.periodoColegaInicio)} a {formatarDataBR(c.periodoColegaFim)}
                                  </span>
                                  <span className={`text-[10px] font-black uppercase ${
                                    c.status === 'APROVADA' ? 'text-rose-700' : 'text-amber-700'
                                  }`}>
                                    {c.status === 'APROVADA' ? 'Férias Homologadas pela Direção' : 'Requerimento sob Análise da Direção'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analiseConflito.sugestao && (
                        <div className="mt-2 p-3 rounded-2xl bg-white/95 border border-slate-200 text-[11px] font-medium leading-relaxed shadow-sm">
                          💡 <b>Recomendação Institucional:</b> {analiseConflito.sugestao}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Observação Adicional */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações ou Justificativa Especial (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Preferência por período coincidente com férias escolares dos filhos..."
                  className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 outline-none"
                />
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={enviando || !todosPreenchidos || !validacaoEstrutural.valido || Boolean(analiseConflito?.temAprovadas)}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition ${
                  enviando || !todosPreenchidos || !validacaoEstrutural.valido || Boolean(analiseConflito?.temAprovadas)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : analiseConflito?.temPendentes
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 active:scale-[0.99]'
                    : 'bg-navy-950 hover:bg-navy-900 text-white shadow-navy-950/20 active:scale-[0.99]'
                }`}
              >
                <Send className="w-4 h-4 text-gold-400" />
                <span>
                  {enviando
                    ? 'Transmitindo Requerimento...'
                    : analiseConflito?.temAprovadas
                    ? 'Período Indisponível para Envio'
                    : analiseConflito?.temPendentes
                    ? 'Submeter Requerimento (Ciente da Concorrência de Escala)'
                    : 'Submeter Solicitação de Férias'}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Coluna Lateral: Minhas Solicitações e Histórico */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-black text-navy-950 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-gold-600" />
              Minhas Solicitações Cadastradas
            </h3>

            {minhasSolicitacoes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center leading-relaxed">
                Você ainda não enviou solicitações de férias para o exercício {config.anoExercicio}.
              </p>
            ) : (
              <div className="space-y-3">
                {minhasSolicitacoes.map(sol => (
                  <div
                    key={sol.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5 transition hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600">
                        {sol.modalidade.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        sol.status === 'APROVADA'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : sol.status === 'PENDENTE'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : sol.status === 'DEVOLVIDA'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}>
                        {sol.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-700">
                      {sol.periodos.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span>Período {p.numeroPeriodo}:</span>
                          <span className="font-semibold">
                            {formatarDataBR(p.dataInicio)} até {formatarDataBR(p.dataFim)} ({p.quantidadeDias}d)
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Justificativa da Direção (especialmente se devolvida ou rejeitada) */}
                    {sol.justificativaDecisao && (
                      <div className={`mt-2 p-2.5 rounded-xl text-[11px] border leading-relaxed ${
                        sol.status === 'DEVOLVIDA'
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : sol.status === 'REJEITADA'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-slate-100 border-slate-200 text-slate-800'
                      }`}>
                        <span className="font-bold block">Parecer da Direção:</span>
                        <span>{sol.justificativaDecisao}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dicas Institucionais */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Regras Importantes:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-900/90 text-[11px] leading-relaxed">
              <li>O limite da unidade é de <b>{userTeam?.limiteAfastamentosSimultaneos || 1} policial</b> afastado por equipe ao mesmo tempo.</li>
              <li>Solicitações são analisadas por ordem cronológica e critérios operacionais da SAP.</li>
              <li>Uma solicitação <b>Aprovada</b> só pode ser alterada mediante despacho formal da Direção.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

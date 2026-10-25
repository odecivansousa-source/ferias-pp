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
import { createSolicitacao } from '../services/dataService';

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

  const validacaoEstrutural = todosPreenchidos
    ? validarPeriodosModalidade(
        modalidade,
        periodosAtivos.map(p => ({ dataInicio: p.dataInicio, dataFim: p.dataFim }))
      )
    : { valido: true, mensagem: '' };

  const analiseConflito = (userTeam && todosPreenchidos && validacaoEstrutural.valido)
    ? analisarConflitosSolicitacao(
        userTeam,
        periodosAtivos.map(p => ({ dataInicio: p.dataInicio, dataFim: p.dataFim })),
        allSolicitacoes
      )
    : null;

  // Minhas solicitações anteriores
  const minhasSolicitacoes = allSolicitacoes.filter(s => s.policialId === currentUser.id);

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

      setSucessoMsg('Solicitação de férias enviada com sucesso para análise da Direção da Unidade!');
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
              {userTeam?.limiteAfastamentosSimultaneos || 3}
            </span>
            <span className="text-[11px] text-slate-300 block">simultâneas</span>
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

            {erroMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Não foi possível enviar</p>
                  <p className="mt-0.5">{erroMsg}</p>
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
                  </div>
                )}
              </div>

              {/* Radar de Conflito em Tempo Real */}
              {todosPreenchidos && analiseConflito && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  analiseConflito.temConflito
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {analiseConflito.temConflito ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-sm">
                        {analiseConflito.temConflito ? 'Alerta de Conflito de Efetivo' : 'Período Disponível na Equipe'}
                      </p>
                      <p className="mt-1">{analiseConflito.mensagem}</p>
                      {analiseConflito.sugestao && (
                        <p className="mt-1.5 font-semibold text-rose-800">
                          💡 Dica: {analiseConflito.sugestao}
                        </p>
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
                disabled={enviando || (todosPreenchidos && !validacaoEstrutural.valido)}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition ${
                  enviando || (todosPreenchidos && !validacaoEstrutural.valido)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-navy-950 hover:bg-navy-900 text-white shadow-navy-950/20 active:scale-[0.99]'
                }`}
              >
                <Send className="w-4 h-4 text-gold-400" />
                <span>{enviando ? 'Enviando Solicitação...' : 'Enviar Solicitação para a Direção'}</span>
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
              <li>O limite é de até <b>{userTeam?.limiteAfastamentosSimultaneos || 3} policiais</b> afastados por equipe ao mesmo tempo.</li>
              <li>Solicitações são analisadas por ordem cronológica e critérios operacionais da SAP.</li>
              <li>Uma solicitação <b>Aprovada</b> só pode ser alterada mediante despacho formal da Direção.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

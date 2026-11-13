import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  CalendarDays,
  Shield,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Umbrella,
  FileText
} from 'lucide-react';
import { Perfil, Equipe, SolicitacaoFerias } from '../types';
import {
  AusenciaPlantao,
  PlantaoConfig,
  RegimePlantao,
  TipoAusencia,
  REGIME_LABELS,
  TIPO_AUSENCIA_LABELS,
  EQUIPE_CORES,
  PolicialPlantao
} from '../types/plantao';
import {
  calcularPlantoesDia,
  getRegimeConfig
} from '../services/shiftEngine';
import {
  createAusencia,
  deleteAusencia,
  updatePerfilRegime,
  updatePlantaoConfig
} from '../services/plantaoService';

interface ShiftDashboardProps {
  perfis: Perfil[];
  equipes: Equipe[];
  solicitacoes: SolicitacaoFerias[];
  ausencias: AusenciaPlantao[];
  plantaoConfig: PlantaoConfig;
  currentUser: Perfil;
  onDataUpdated: () => void;
}

export const ShiftDashboard: React.FC<ShiftDashboardProps> = ({

  perfis,
  equipes,
  solicitacoes,
  ausencias,
  plantaoConfig,
  currentUser,
  onDataUpdated,
}) => {
  const isDiretor = currentUser.papel === 'diretor' || (currentUser.papel as string) === 'admin';

  // Sub-abas internas
  const [subTab, setSubTab] = useState<'hoje' | 'calendario' | 'ausencias' | 'regimes'>('hoje');

  // Data selecionada para visualização do plantão diário (padrão: hoje)
  const hojeStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dataSelecionada, setDataSelecionada] = useState<string>(hojeStr);

  // Mês/Ano selecionado no calendário
  const [mesCalendario, setMesCalendario] = useState<Date>(new Date());

  // Estado para Modal de Registro de Ausência
  const [modalAusenciaOpen, setModalAusenciaOpen] = useState(false);
  const [novaAusencia, setNovaAusencia] = useState<{
    policialId: string;
    tipo: TipoAusencia;
    dataInicio: string;
    dataFim: string;
    observacao: string;
  }>({
    policialId: '',
    tipo: 'ATESTADO',
    dataInicio: hojeStr,
    dataFim: hojeStr,
    observacao: '',
  });

  // Estado para Modal de Configuração de Regime
  const [modalRegimeOpen, setModalRegimeOpen] = useState(false);
  const [policialParaRegime, setPolicialParaRegime] = useState<Perfil | null>(null);
  const [regimeSelecionado, setRegimeSelecionado] = useState<RegimePlantao>('1x3');
  const [dataRefSelecionada, setDataRefSelecionada] = useState<string>(hojeStr);

  // Modal para detalhes de um dia no calendário
  const [diaDetalheModal, setDiaDetalheModal] = useState<string | null>(null);

  // Equipes de plantão operacional 24h (exclui ADM/Expediente)
  const equipesOperacionais = useMemo(() => {
    return equipes.filter(e => e.codigo !== 'ADM' && e.id !== '00000000-0000-0000-0000-000000000000' && e.nome !== 'ADM');
  }, [equipes]);

  // Cálculo do plantão para a data selecionada
  const plantoesDia = useMemo(() => {
    return calcularPlantoesDia(
      dataSelecionada,
      perfis,
      equipes,
      ausencias,
      solicitacoes,
      plantaoConfig.efetivoMinimo,
      plantaoConfig.efetivoAlerta
    );
  }, [dataSelecionada, perfis, equipes, ausencias, solicitacoes, plantaoConfig]);

  // Alerta global do dia
  const temAlertaCritico = plantoesDia.some(p => p.status === 'CRITICO' && p.totalEscalados > 0);
  const temAlertaModerado = plantoesDia.some(p => p.status === 'ALERTA' && p.totalEscalados > 0);

  // Policiais sem regime configurado
  const policiaisSemRegime = useMemo(() => {
    // Diretor não entra na cobrança de escala de plantão
    return perfis.filter(p => p.situacao === 'ativo' && p.papel !== 'diretor' && (p.papel as string) !== 'admin' && (!p.regime || !p.dataReferenciaPlantao));
  }, [perfis]);

  // Navegar dia anterior / próximo
  const alterarDia = (dias: number) => {
    const atual = new Date(`${dataSelecionada}T12:00:00Z`);
    atual.setDate(atual.getDate() + dias);
    setDataSelecionada(atual.toISOString().split('T')[0]);
  };

  // Salvar Ausência
  const handleSalvarAusencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAusencia.policialId) {
      alert('Selecione o policial penal.');
      return;
    }
    if (novaAusencia.dataInicio > novaAusencia.dataFim) {
      alert('A data de início não pode ser posterior à data de término.');
      return;
    }

    try {
      await createAusencia({
        policialId: novaAusencia.policialId,
        tipo: novaAusencia.tipo,
        dataInicio: novaAusencia.dataInicio,
        dataFim: novaAusencia.dataFim,
        observacao: novaAusencia.observacao,
      });
      setModalAusenciaOpen(false);
      setNovaAusencia({
        policialId: '',
        tipo: 'ATESTADO',
        dataInicio: hojeStr,
        dataFim: hojeStr,
        observacao: '',
      });
      onDataUpdated();
    } catch (err: any) {
      alert('Erro ao salvar ausência: ' + err.message);
    }
  };

  // Excluir Ausência
  const handleExcluirAusencia = async (id: string) => {
    if (confirm('Deseja realmente remover este registro de afastamento?')) {
      await deleteAusencia(id);
      onDataUpdated();
    }
  };

  // Abrir Modal de Regime
  const handleAbrirConfigRegime = (policial: Perfil) => {
    setPolicialParaRegime(policial);
    setRegimeSelecionado(policial.regime || '1x3');
    setDataRefSelecionada(policial.dataReferenciaPlantao || hojeStr);
    setModalRegimeOpen(true);
  };

  // Salvar Regime
  const [salvandoRegime, setSalvandoRegime] = useState(false);
  const handleSalvarRegime = async () => {
    if (!policialParaRegime) return;
    setSalvandoRegime(true);
    try {
      await updatePerfilRegime(policialParaRegime.id, regimeSelecionado, dataRefSelecionada, policialParaRegime.matricula);
      // Atualizar o objeto imediatamente na memória do componente
      policialParaRegime.regime = regimeSelecionado;
      policialParaRegime.dataReferenciaPlantao = dataRefSelecionada;

      setModalRegimeOpen(false);
      setPolicialParaRegime(null);
      onDataUpdated();
      alert('✅ Escala salva com sucesso!');
    } catch (err: any) {
      alert('Erro ao atualizar regime: ' + (err?.message || err));
    } finally {
      setSalvandoRegime(false);
    }
  };

  // Dias dos próximos 7 dias para visualização rápida
  const proximosDias = useMemo(() => {
    const list: string[] = [];
    const base = new Date(`${dataSelecionada}T12:00:00Z`);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      list.push(d.toISOString().split('T')[0]);
    }
    return list;
  }, [dataSelecionada]);

  // Dias do mês para o Calendário
  const diasDoMes = useMemo(() => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    const dias: { dataStr: string; diaNumero: number; diaSemana: number; ehDoMes: boolean }[] = [];

    // Preenchimento dos dias anteriores
    const diaSemanaInicio = primeiroDia.getDay(); // 0 = Domingo
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const d = new Date(ano, mes, -i);
      dias.push({
        dataStr: d.toISOString().split('T')[0],
        diaNumero: d.getDate(),
        diaSemana: d.getDay(),
        ehDoMes: false,
      });
    }

    // Dias do mês atual
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const d = new Date(ano, mes, dia);
      dias.push({
        dataStr: d.toISOString().split('T')[0],
        diaNumero: dia,
        diaSemana: d.getDay(),
        ehDoMes: true,
      });
    }

    return dias;
  }, [mesCalendario]);

  // Lista de policiais em férias ativas na data selecionada
  const policiaisEmFeriasHoje = useMemo(() => {
    return solicitacoes
      .filter(s => s.status === 'APROVADA')
      .filter(s => (s.periodos || []).some(p => p.dataInicio <= dataSelecionada && dataSelecionada <= p.dataFim))
      .map(s => {
        const pol = perfis.find(p => p.id === s.policialId);
        const eq = equipes.find(e => e.id === s.equipeId);
        return {
          policial: pol,
          equipe: eq,
          solicitacao: s,
        };
      });
  }, [solicitacoes, perfis, equipes, dataSelecionada]);

  // Formatador de data amigável
  const formatarDataBR = (dataStr: string) => {
    if (!dataStr) return '';
    const partes = dataStr.split('-');
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const getNomeEquipe = (equipeId: string) => {
    return equipes.find(e => e.id === equipeId)?.nome || 'Equipe';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-navy-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-gold-500/20 text-gold-300 px-3 py-1 rounded-full text-xs font-bold border border-gold-400/30">
              <Shield className="w-3.5 h-3.5" />
              <span>GESTÃO OPERACIONAL DE EFETIVO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Escala de Plantão da Unidade
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Acompanhamento em tempo real do efetivo disponível por equipe (Alfa, Bravo, Charlie, Delta),
              cálculo automático de ciclos (1×3, 2×6, 3×9) e controle de ausências (férias, atestados e licenças).
            </p>
          </div>

          {/* Seletor rápido de data com botões de navegação */}
          <div className="bg-navy-900/90 border border-slate-700/80 rounded-2xl p-3 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold text-center">
              Plantão em Análise
            </span>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => alterarDia(-1)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                title="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={dataSelecionada}
                onChange={e => setDataSelecionada(e.target.value)}
                className="bg-navy-950 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-gold-400"
              />
              <button
                onClick={() => alterarDia(1)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                title="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {dataSelecionada !== hojeStr && (
              <button
                onClick={() => setDataSelecionada(hojeStr)}
                className="text-[10px] text-gold-400 hover:text-gold-300 font-bold underline text-center"
              >
                Voltar para Hoje
              </button>
            )}
          </div>
        </div>

        {/* ALERTA DE POLICIAIS SEM REGIME */}
        {policiaisSemRegime.length > 0 && isDiretor && (
          <div className="mt-5 bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Atenção:</strong> Há <strong>{policiaisSemRegime.length} policial(is)</strong> sem regime ou data de início de escala configurados.
              </span>
            </div>
            <button
              onClick={() => setSubTab('regimes')}
              className="bg-amber-400 hover:bg-amber-300 text-navy-950 px-3 py-1 rounded-lg font-bold text-xs transition whitespace-nowrap"
            >
              Configurar Agora
            </button>
          </div>
        )}

        {/* ALERTA DE EFETIVO ABAIXO DO MÍNIMO */}
        {temAlertaCritico && (
          <div className="mt-3 bg-red-600/30 border border-red-500/60 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-red-200">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <strong className="text-white">ALERTA CRÍTICO DE SEGURANÇA:</strong> Há equipe com efetivo abaixo de {plantaoConfig.efetivoAlerta} policiais nesta data!
              Providenciar reforço operacional ou cancelamento de dispensas.
            </div>
          </div>
        )}
      </div>

      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('hoje')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'hoje'
              ? 'bg-navy-900 text-white shadow'
              : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Plantão do Dia ({formatarDataBR(dataSelecionada)})</span>
        </button>

        <button
          onClick={() => setSubTab('calendario')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'calendario'
              ? 'bg-navy-900 text-white shadow'
              : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Calendário Mensal de Escalas</span>
        </button>

        <button
          onClick={() => setSubTab('ausencias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'ausencias'
              ? 'bg-navy-900 text-white shadow'
              : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Atestados & Afastamentos ({ausencias.length})</span>
        </button>

        {isDiretor && (
          <button
            onClick={() => setSubTab('regimes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              subTab === 'regimes'
                ? 'bg-navy-900 text-white shadow'
                : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Configurar Regimes dos Policiais</span>
          </button>
        )}
      </div>

      {/* SUB-ABA 1: VISÃO DO DIA */}
      {subTab === 'hoje' && (
        <div className="space-y-6">
          {/* CARDS DAS 4 EQUIPES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plantoesDia.map(plantao => {
              const cor = EQUIPE_CORES[plantao.equipeNome.toUpperCase()] ||
                          EQUIPE_CORES[plantao.equipeCodigo.toUpperCase()] ||
                          EQUIPE_CORES['ALFA'];

              const policiaisEscalados = plantao.policiais.filter(p => p.escalado);

              return (
                <div
                  key={plantao.equipeId}
                  className={`bg-white rounded-3xl border-2 transition-all p-5 shadow-sm hover:shadow-md ${
                    plantao.status === 'CRITICO'
                      ? 'border-red-400 bg-red-50/20'
                      : plantao.status === 'ALERTA'
                      ? 'border-amber-400 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Cabeçalho da Equipe */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${cor.bg}`} />
                      <h3 className="font-black text-navy-950 text-base">
                        {plantao.equipeNome}
                      </h3>
                    </div>

                    {/* Badge de Efetivo */}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        plantao.status === 'CRITICO'
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : plantao.status === 'ALERTA'
                          ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      }`}
                    >
                      {plantao.status === 'CRITICO' ? 'CRÍTICO' : plantao.status === 'ALERTA' ? 'ALERTA' : 'EFETIVO OK'}
                    </span>
                  </div>

                  {/* Resumo Numérico */}
                  <div className="grid grid-cols-3 gap-2 text-center my-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Escalados</div>
                      <div className="text-lg font-black text-navy-950">{plantao.totalEscalados}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Ausentes</div>
                      <div className="text-lg font-black text-rose-600">
                        {plantao.totalAusentes > 0 ? `-${plantao.totalAusentes}` : '0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        {plantao.diretorPresenteDiurno ? 'Efetivo Diurno' : 'Presentes'}
                      </div>
                      <div className={`text-lg font-black ${
                        (plantao.diretorPresenteDiurno ? plantao.efetivoDiurno : plantao.efetivoReal) < plantaoConfig.efetivoAlerta
                          ? 'text-red-600'
                          : (plantao.diretorPresenteDiurno ? plantao.efetivoDiurno : plantao.efetivoReal) < plantaoConfig.efetivoMinimo
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        {plantao.diretorPresenteDiurno ? plantao.efetivoDiurno : plantao.efetivoReal}
                      </div>
                    </div>
                  </div>
                  {plantao.diretorPresenteDiurno && (
                    <div className="text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1">🏢 Inclui Diretor no Diurno (Seg a Sex)</span>
                      <span className="font-mono text-blue-700">Noturno: {plantao.efetivoReal} pol.</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 mb-2">
                    Meta mínima: <strong>{plantaoConfig.efetivoMinimo} policiais</strong>
                  </div>

                  {/* Lista de Policiais Escalados */}
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 max-h-56 overflow-y-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Policiais Escalados ({policiaisEscalados.length})
                    </div>

                    {policiaisEscalados.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2 text-center">
                        Nenhum policial desta equipe escalado nesta data.
                      </div>
                    ) : (
                      policiaisEscalados.map(pol => (
                        <div
                          key={pol.id}
                          className={`flex items-center justify-between text-xs p-1.5 rounded-lg border ${
                            pol.isDiretor
                              ? 'bg-blue-50/90 border-blue-200 text-blue-950 font-semibold'
                              : pol.ausente
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="truncate min-w-0 pr-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold truncate">{pol.nome}</span>
                              {pol.isDiretor && (
                                <span className="bg-navy-950 text-gold-400 font-black text-[8px] px-1.5 py-0.2 rounded">
                                  DIRETOR
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Mat: {pol.matricula} • {pol.isDiretor ? 'Expediente Comercial (Seg a Sex)' : (pol.regime || 'S/ Regime')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {pol.ausente ? (
                              <span className="text-[9px] font-black uppercase bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">
                                {pol.motivoAusencia || 'AUSENTE'}
                              </span>
                            ) : pol.isDiretor ? (
                              <span className="text-[9px] font-black text-blue-800 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded">
                                PRESENTE (DIURNO)
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                PRESENTE (24H)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABELA DE PREVISÃO DOS PRÓXIMOS 7 DIAS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-navy-950 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold-500" />
                  <span>Previsão de Efetivo Real — Próximos 7 Dias</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Projeção automática baseada nos regimes de trabalho e férias/afastamentos programados.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-bold">Equipe</th>
                    {proximosDias.map(dia => {
                      const d = new Date(`${dia}T12:00:00Z`);
                      const diaSemanaCurto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
                      const ehHoje = dia === hojeStr;
                      return (
                        <th key={dia} className={`py-2.5 px-3 font-bold text-center ${ehHoje ? 'bg-gold-50 text-gold-900' : ''}`}>
                          <div>{diaSemanaCurto}</div>
                          <div className="text-[10px] font-mono text-slate-500">{formatarDataBR(dia).slice(0, 5)}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipesOperacionais.map(eq => {
                    return (
                      <tr key={eq.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-navy-950 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            EQUIPE_CORES[eq.nome.toUpperCase()]?.bg || 'bg-slate-400'
                          }`} />
                          <span>{eq.nome}</span>
                        </td>

                        {proximosDias.map(dia => {
                          const resDia = calcularPlantoesDia(
                            dia,
                            perfis,
                            [eq],
                            ausencias,
                            solicitacoes,
                            plantaoConfig.efetivoMinimo,
                            plantaoConfig.efetivoAlerta
                          )[0];

                          const dDia = new Date(`${dia}T12:00:00Z`);
                          const ehDiaSemana = dDia.getUTCDay() >= 1 && dDia.getUTCDay() <= 5;
                          const efetivo = ehDiaSemana ? (resDia?.efetivoDiurno ?? 0) : (resDia?.efetivoReal ?? 0);
                          const totalEsc = resDia?.totalEscalados ?? 0;

                          let badgeClass = 'bg-slate-100 text-slate-500';
                          if (totalEsc > 0) {
                            if (efetivo < plantaoConfig.efetivoAlerta) {
                              badgeClass = 'bg-red-100 text-red-800 font-extrabold border border-red-300';
                            } else if (efetivo < plantaoConfig.efetivoMinimo) {
                              badgeClass = 'bg-amber-100 text-amber-800 font-extrabold border border-amber-300';
                            } else {
                              badgeClass = 'bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300';
                            }
                          }

                          return (
                            <td key={dia} className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-1 rounded-lg text-xs ${badgeClass}`}>
                                {totalEsc === 0 ? '-' : `${efetivo} pol.`}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* POLICIAIS EM FÉRIAS OU AFASTADOS NA DATA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Férias */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <h4 className="font-black text-navy-950 text-sm flex items-center gap-2 mb-3">
                <Umbrella className="w-4 h-4 text-emerald-600" />
                <span>Em Férias nesta Data ({policiaisEmFeriasHoje.length})</span>
              </h4>

              {policiaisEmFeriasHoje.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum policial em férias nesta data.</p>
              ) : (
                <div className="space-y-2">
                  {policiaisEmFeriasHoje.map(item => (
                    <div key={item.solicitacao.id} className="flex items-center justify-between text-xs p-2 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <div>
                        <div className="font-bold text-navy-950">{item.policial?.nomeCompleto}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Mat: {item.policial?.matricula} • {item.equipe?.nome}
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                        FÉRIAS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card Atestados/Afastamentos */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-navy-950 text-sm flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-rose-600" />
                  <span>Atestados e Licenças</span>
                </h4>
                {isDiretor && (
                  <button
                    onClick={() => {
                      setNovaAusencia({
                        policialId: perfis[0]?.id || '',
                        tipo: 'ATESTADO',
                        dataInicio: dataSelecionada,
                        dataFim: dataSelecionada,
                        observacao: '',
                      });
                      setModalAusenciaOpen(true);
                    }}
                    className="text-xs font-bold text-navy-950 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar</span>
                  </button>
                )}
              </div>

              {ausencias.filter(a => a.dataInicio <= dataSelecionada && dataSelecionada <= a.dataFim).length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum atestado ou licença ativo nesta data.</p>
              ) : (
                <div className="space-y-2">
                  {ausencias
                    .filter(a => a.dataInicio <= dataSelecionada && dataSelecionada <= a.dataFim)
                    .map(a => {
                      const pol = perfis.find(p => p.id === a.policialId);
                      const eq = equipes.find(e => e.id === pol?.equipeId);
                      return (
                        <div key={a.id} className="flex items-center justify-between text-xs p-2 bg-rose-50/60 rounded-xl border border-rose-200">
                          <div>
                            <div className="font-bold text-navy-950">{pol?.nomeCompleto}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Mat: {pol?.matricula} • {eq?.nome} • Até {formatarDataBR(a.dataFim)}
                            </div>
                          </div>
                          <span className="text-[10px] bg-rose-200 text-rose-900 font-bold px-2 py-0.5 rounded">
                            {TIPO_AUSENCIA_LABELS[a.tipo]}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: CALENDÁRIO MENSAL */}
      {subTab === 'calendario' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          {/* Navegador de Mês */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-navy-950 text-base flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-gold-500" />
                <span>
                  {mesCalendario.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique em qualquer dia para ver a escala e efetivo daquele plantão.
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - 1, 1))}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
                title="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMesCalendario(new Date())}
                className="text-xs font-bold text-navy-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
              >
                Mês Atual
              </button>
              <button
                onClick={() => setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 1))}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
                title="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Grade de Dias da Semana */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-400 uppercase py-1 border-b border-slate-100">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Grade de Células do Calendário */}
          <div className="grid grid-cols-7 gap-1.5">
            {diasDoMes.map(dia => {
              const plantoes = calcularPlantoesDia(
                dia.dataStr,
                perfis,
                equipes,
                ausencias,
                solicitacoes,
                plantaoConfig.efetivoMinimo,
                plantaoConfig.efetivoAlerta
              );

              const ehHoje = dia.dataStr === hojeStr;
              const ehSelecionado = dia.dataStr === dataSelecionada;

              // Equipes com policiais trabalhando no dia
              const equipesTrabalhando = plantoes.filter(p => p.totalEscalados > 0);

              return (
                <div
                  key={dia.dataStr}
                  onClick={() => {
                    setDataSelecionada(dia.dataStr);
                    setDiaDetalheModal(dia.dataStr);
                  }}
                  className={`min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    !dia.ehDoMes
                      ? 'bg-slate-50/50 text-slate-300 border-slate-100'
                      : ehSelecionado
                      ? 'bg-navy-50/50 border-navy-900 shadow-sm'
                      : ehHoje
                      ? 'bg-gold-50/50 border-gold-400'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black rounded-lg w-6 h-6 flex items-center justify-center ${
                        ehHoje
                          ? 'bg-gold-500 text-navy-950 shadow-sm'
                          : ehSelecionado
                          ? 'bg-navy-900 text-white'
                          : dia.ehDoMes
                          ? 'text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {dia.diaNumero}
                    </span>
                  </div>

                  {/* Badges das equipes que trabalham neste dia */}
                  <div className="space-y-1 my-1">
                    {equipesTrabalhando.map(eq => {
                      const cor = EQUIPE_CORES[eq.equipeNome.toUpperCase()] ||
                                  EQUIPE_CORES[eq.equipeCodigo.toUpperCase()] ||
                                  EQUIPE_CORES['ALFA'];

                      return (
                        <div
                          key={eq.equipeId}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center justify-between border ${
                            eq.status === 'CRITICO'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : eq.status === 'ALERTA'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : `${cor.light} ${cor.text} ${cor.border}`
                          }`}
                        >
                          <span className="truncate">{eq.equipeNome}</span>
                          <span className="font-mono">{(() => {
                            const dCal = new Date(`${dia.dataStr}T12:00:00Z`);
                            const ehUtil = dCal.getUTCDay() >= 1 && dCal.getUTCDay() <= 5;
                            return ehUtil ? eq.efetivoDiurno : eq.efetivoReal;
                          })()}p</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: GESTÃO DE AFASTAMENTOS E ATESTADOS */}
      {subTab === 'ausencias' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-black text-navy-950 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-rose-600" />
                  <span>Afastamentos & Atestados Médicos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registre atestados, licenças e cursos para descontar automaticamente do efetivo nos plantões.
                </p>
              </div>

              {isDiretor && (
                <button
                  onClick={() => {
                    setNovaAusencia({
                      policialId: perfis[0]?.id || '',
                      tipo: 'ATESTADO',
                      dataInicio: hojeStr,
                      dataFim: hojeStr,
                      observacao: '',
                    });
                    setModalAusenciaOpen(true);
                  }}
                  className="bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm"
                >
                  <Plus className="w-4 h-4 text-gold-400" />
                  <span>Novo Afastamento</span>
                </button>
              )}
            </div>

            {ausencias.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Stethoscope className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Nenhum afastamento cadastrado</p>
                <p className="text-xs text-slate-400 mt-1">
                  Clique em "Novo Afastamento" para lançar um atestado médico ou licença.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="py-3 px-4 font-bold">Policial</th>
                      <th className="py-3 px-4 font-bold">Equipe</th>
                      <th className="py-3 px-4 font-bold">Tipo de Afastamento</th>
                      <th className="py-3 px-4 font-bold">Período</th>
                      <th className="py-3 px-4 font-bold">Observação</th>
                      {isDiretor && <th className="py-3 px-4 font-bold text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ausencias.map(a => {
                      const pol = perfis.find(p => p.id === a.policialId);
                      const eq = equipes.find(e => e.id === pol?.equipeId);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <div className="font-bold text-navy-950">{pol?.nomeCompleto || 'Desconhecido'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Mat: {pol?.matricula}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700">
                            {eq?.nome || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200">
                              {TIPO_AUSENCIA_LABELS[a.tipo]}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {formatarDataBR(a.dataInicio)} até {formatarDataBR(a.dataFim)}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {a.observacao || '-'}
                          </td>
                          {isDiretor && (
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleExcluirAusencia(a.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                                title="Excluir afastamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-ABA 4: CONFIGURAÇÃO DE REGIMES DOS POLICIAIS */}
      {subTab === 'regimes' && isDiretor && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-base font-black text-navy-950 flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold-500" />
                <span>Configuração de Escala Individual dos Policiais</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina o regime de trabalho (1×3, 2×6 ou 3×9) e a data de referência (1º dia de plantão) de cada policial.
              </p>
            </div>

            <div className="space-y-6">
              {/* Card Exclusivo do Diretor / ADM */}
              {(() => {
                const diretor = perfis.find(p => p.papel === 'diretor' || (p.papel as string) === 'admin');
                if (!diretor) return null;
                return (
                  <div className="border border-blue-200 bg-blue-50/40 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-blue-900 to-navy-900 text-white px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gold-400" />
                        <h4 className="font-black text-sm">Direção Geral — ADM</h4>
                        <span className="text-[11px] text-blue-200 font-medium">(Horário Comercial / Expediente Administrativo)</span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-navy-950 text-sm flex items-center gap-2">
                          <span>{diretor.nomeCompleto}</span>
                          <span className="bg-navy-950 text-gold-400 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-gold-500/30">
                            DIRETOR
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Matrícula: {diretor.matricula}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-blue-950 bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-xl shadow-xs inline-flex items-center gap-1.5">
                          💼 ADM — Expediente Comercial (Fora da escala 24h)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {equipesOperacionais.map(eq => {
                // Policiais ativos pertencentes a esta equipe operacional (exclui Diretor)
                const membros = perfis.filter(p => p.equipeId === eq.id && p.situacao === 'ativo' && p.papel !== 'diretor' && (p.papel as string) !== 'admin');

                return (
                  <div key={eq.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          EQUIPE_CORES[eq.nome.toUpperCase()]?.bg || 'bg-slate-400'
                        }`} />
                        <h4 className="font-black text-navy-950 text-sm">{eq.nome}</h4>
                        <span className="text-xs text-slate-400">({membros.length} policiais ativos)</span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {membros.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400 italic text-center">
                          Nenhum policial cadastrado nesta equipe.
                        </div>
                      ) : (
                        membros.map(pol => {
                          const isDir = pol.papel === 'diretor' || (pol.papel as string) === 'admin';
                          const temConfig = pol.regime && pol.dataReferenciaPlantao;

                          return (
                            <div key={pol.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                              <div>
                                <div className="font-bold text-navy-950 text-xs flex items-center gap-2">
                                  <span>{pol.nomeCompleto}</span>
                                  {isDir && (
                                    <span className="bg-navy-950 text-gold-400 font-extrabold text-[9px] px-2 py-0.5 rounded-full border border-gold-500/30">
                                      DIRETOR
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Matrícula: {pol.matricula}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {isDir ? (
                                  <div className="text-right">
                                    <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                                      💼 ADM — Horário Comercial
                                    </span>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                      Expediente Administrativo
                                    </div>
                                  </div>
                                ) : temConfig ? (
                                  <div className="text-right">
                                    <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                      {REGIME_LABELS[pol.regime!]}
                                    </span>
                                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                      Início do bloco: <strong>{formatarDataBR(pol.dataReferenciaPlantao!)}</strong>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                    ⚠️ Não Configurado
                                  </span>
                                )}

                                {!isDir && (
                                  <button
                                    onClick={() => handleAbrirConfigRegime(pol)}
                                    className="text-xs font-bold text-navy-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>{temConfig ? 'Editar' : 'Configurar'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR REGIME DO POLICIAL */}
      {modalRegimeOpen && policialParaRegime && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-navy-950 text-base">Definir Regime de Escala</h3>
                <p className="text-xs text-slate-500">{policialParaRegime.nomeCompleto}</p>
              </div>
              <button
                onClick={() => setModalRegimeOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Regime de Trabalho:
                </label>
                <div className="space-y-2">
                  {(['1x3', '2x6', '3x9'] as RegimePlantao[]).map(r => (
                    <label
                      key={r}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        regimeSelecionado === r
                          ? 'border-navy-900 bg-navy-50/50 text-navy-950 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="regime"
                        value={r}
                        checked={regimeSelecionado === r}
                        onChange={() => setRegimeSelecionado(r)}
                        className="text-navy-900 focus:ring-navy-900"
                      />
                      <span>{REGIME_LABELS[r]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Data de Início do Bloco de Trabalho (Referência):
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Informe a data do 1º dia trabalhado recente. (Ex: para você que trabalhou 07 e 08/11 em 2×6, informe <strong>2026-11-07</strong>).
                </p>
                <input
                  type="date"
                  value={dataRefSelecionada}
                  onChange={e => setDataRefSelecionada(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-navy-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setModalRegimeOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarRegime}
                className="px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-xl transition shadow"
              >
                Salvar Escala
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR AFASTAMENTO */}
      {modalAusenciaOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleSalvarAusencia} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-navy-950 text-base flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-rose-600" />
                <span>Registrar Afastamento / Atestado</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalAusenciaOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Policial Penal:</label>
                <select
                  value={novaAusencia.policialId}
                  onChange={e => setNovaAusencia({ ...novaAusencia, policialId: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-navy-900"
                >
                  <option value="">Selecione o policial...</option>
                  {perfis.filter(p => p.papel !== 'diretor' && (p.papel as string) !== 'admin').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nomeCompleto} ({p.matricula}) — {getNomeEquipe(p.equipeId)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Afastamento:</label>
                <select
                  value={novaAusencia.tipo}
                  onChange={e => setNovaAusencia({ ...novaAusencia, tipo: e.target.value as TipoAusencia })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-navy-900"
                >
                  {Object.entries(TIPO_AUSENCIA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Início:</label>
                  <input
                    type="date"
                    value={novaAusencia.dataInicio}
                    onChange={e => setNovaAusencia({ ...novaAusencia, dataInicio: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-navy-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Término:</label>
                  <input
                    type="date"
                    value={novaAusencia.dataFim}
                    onChange={e => setNovaAusencia({ ...novaAusencia, dataFim: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-navy-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações (Opcional):</label>
                <textarea
                  value={novaAusencia.observacao}
                  onChange={e => setNovaAusencia({ ...novaAusencia, observacao: e.target.value })}
                  rows={2}
                  placeholder="Número de protocolo do atestado, CID, motivo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-navy-900 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAusenciaOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 rounded-xl transition shadow"
              >
                Salvar Afastamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DETALHE DO DIA CLICADO NO CALENDÁRIO */}
      {diaDetalheModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-navy-950 text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold-500" />
                  <span>Plantão de {formatarDataBR(diaDetalheModal)}</span>
                </h3>
              </div>
              <button
                onClick={() => setDiaDetalheModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {calcularPlantoesDia(
                diaDetalheModal,
                perfis,
                equipes,
                ausencias,
                solicitacoes,
                plantaoConfig.efetivoMinimo,
                plantaoConfig.efetivoAlerta
              ).map(pl => {
                const cor = EQUIPE_CORES[pl.equipeNome.toUpperCase()] || EQUIPE_CORES['ALFA'];
                const escalados = pl.policiais.filter(p => p.escalado);

                return (
                  <div key={pl.equipeId} className="border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${cor.bg}`} />
                        <span className="font-bold text-navy-950 text-xs">{pl.equipeNome}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        pl.status === 'CRITICO' ? 'bg-red-100 text-red-800' : pl.status === 'ALERTA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {pl.efetivoReal} de {pl.totalEscalados} presentes
                      </span>
                    </div>

                    {escalados.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Folga geral para esta equipe.</p>
                    ) : (
                      <div className="space-y-1">
                        {escalados.map(pol => (
                          <div key={pol.id} className="flex items-center justify-between text-xs p-1 rounded bg-slate-50 text-slate-700">
                            <span className="font-medium">{pol.nome}</span>
                            {pol.ausente ? (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                {pol.motivoAusencia}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-700">OK</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setDiaDetalheModal(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-navy-900 rounded-xl"
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

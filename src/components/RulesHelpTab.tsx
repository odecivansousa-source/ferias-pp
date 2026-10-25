import React from 'react';
import { HelpCircle, Calendar, ShieldCheck, CheckCircle2, Smartphone, FileText, AlertTriangle } from 'lucide-react';
import { ConfiguracaoFerias } from '../types';

interface RulesHelpTabProps {
  config: ConfiguracaoFerias;
}

export const RulesHelpTab: React.FC<RulesHelpTabProps> = ({ config }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-2">
        <div className="inline-flex items-center gap-2 bg-navy-50 text-navy-900 px-3 py-1 rounded-full text-xs font-bold mb-2">
          <HelpCircle className="w-4 h-4 text-gold-600" />
          <span>Manual de Instruções e Normas da Unidade</span>
        </div>
        <h2 className="text-2xl font-black text-navy-950">
          Regulamento de Férias dos Policiais Penais
        </h2>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Orientações institucionais para o planejamento, preenchimento, submissão e homologação do plano anual de férias da unidade prisional para o exercício <b>{config.anoExercicio}</b>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Modalidades Permitidas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-base font-black text-navy-950 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-5 h-5 text-gold-600" />
            1. Modalidades de Férias Permitidas
          </h3>
          <ul className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <li className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <strong className="text-navy-950 block text-xs">Modalidade 1: 30 Dias Corridos</strong>
              Período único contínuo de 30 dias corridos.
            </li>
            <li className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <strong className="text-navy-950 block text-xs">Modalidade 2: Dois Períodos de 15 Dias</strong>
              Fracionamento em 2 períodos de exatamente 15 dias cada (totalizando 30 dias).
            </li>
            <li className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <strong className="text-navy-950 block text-xs">Modalidade 3: Três Períodos de 10 Dias</strong>
              Fracionamento em 3 períodos de exatamente 10 dias cada (totalizando 30 dias).
            </li>
          </ul>
        </div>

        {/* Card 2: Efetivo Mínimo & Limites de Equipe */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-base font-black text-navy-950 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-gold-600" />
            2. Limites de Efetivo por Equipe
          </h3>
          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <p>
              Para assegurar a segurança contínua da unidade prisional, o sistema aplica limites estritos de afastamentos simultâneos configurados para cada plantão (Equipes 1, 2, 3 e 4).
            </p>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Controle de Concorrência:
              </span>
              <span>
                Caso o número de policiais já aprovados atinja o limite máximo da equipe, o sistema alertará imediatamente antes do envio e bloqueará aprovações concorrentes que violem o teto.
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Fluxo de Tramitação */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-base font-black text-navy-950 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-gold-600" />
            3. Fluxo de Tramitação
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed">
            <li>O policial acessa pelo celular ou computador e seleciona as datas.</li>
            <li>O sistema verifica se há vagas disponíveis na equipe.</li>
            <li>A solicitação é registrada com status <b>PENDENTE</b>.</li>
            <li>A Diretoria analisa o pedido e verifica a escala geral.</li>
            <li>O pedido pode ser <b>HOMOLOGADO (Aprovado)</b>, <b>DEVOLVIDO PARA CORREÇÃO</b> (com orientações da diretoria) ou <b>REJEITADO</b>.</li>
          </ol>
        </div>

        {/* Card 4: Aplicativo no Celular (PWA) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-base font-black text-navy-950 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Smartphone className="w-5 h-5 text-gold-600" />
            4. Como Instalar no Celular (Aplicativo Direto)
          </h3>
          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <p>
              O sistema FÉRIAS PP foi desenvolvido como uma Aplicação Web Progressiva (PWA). Ele pode ser instalado diretamente na tela inicial do seu celular Android ou iPhone sem precisar de lojas de aplicativos pagas.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-navy-950 block">No Android (Google Chrome):</span>
              <span>Toque nos 3 pontinhos do navegador e selecione <b>"Adicionar à tela inicial"</b> ou <b>"Instalar aplicativo"</b>.</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-navy-950 block">No iPhone (Safari):</span>
              <span>Toque no botão Compartilhar e selecione <b>"Adicionar à Tela de Início"</b>.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

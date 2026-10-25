import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MasterCalendar } from './components/MasterCalendar';
import { VacationWizard } from './components/VacationWizard';
import { DirectorPanel } from './components/DirectorPanel';
import { AdminPanel } from './components/AdminPanel';
import { SapReportsTab } from './components/SapReportsTab';
import { RulesHelpTab } from './components/RulesHelpTab';
import { SupabaseModal } from './components/SupabaseModal';

import { Perfil, Equipe, SolicitacaoFerias, ConfiguracaoFerias, HistoricoAuditoria } from './types';
import { 
  getEquipes, 
  getPerfis, 
  getConfiguracao, 
  getSolicitacoes, 
  getHistoricoAuditoria,
  getActiveUserId,
  setActiveUserId,
  DEFAULT_FALLBACK_USER
} from './services/dataService';
import { MOCK_CONFIGURACAO, MOCK_EQUIPES, generateMockPoliciais } from './services/mockData';
import { RefreshCw, Shield, ExternalLink } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTabState] = useState<string>('calendario');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [config, setConfig] = useState<ConfiguracaoFerias>(MOCK_CONFIGURACAO);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoFerias[]>([]);
  const [historico, setHistorico] = useState<HistoricoAuditoria[]>([]);

  // Inicia com fallback garantido para evitar tela branca ou travamento infinito
  const [currentUser, setCurrentUser] = useState<Perfil>(() => {
    try {
      const mock = generateMockPoliciais();
      const savedId = getActiveUserId();
      return mock.find(p => p.id === savedId) || mock[0];
    } catch(e) {
      return DEFAULT_FALLBACK_USER;
    }
  });

  const [supabaseModalOpen, setSupabaseModalOpen] = useState<boolean>(false);

  // Sincronização com o Hash da URL para permitir navegação direta e compatibilidade com GitHub Pages
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const [eqs, perfs, cfg, sols, hist] = await Promise.all([
        getEquipes(),
        getPerfis(),
        getConfiguracao(),
        getSolicitacoes(),
        getHistoricoAuditoria(),
      ]);

      const validPerfis = Array.isArray(perfs) && perfs.length > 0 ? perfs : generateMockPoliciais();
      const validEquipes = Array.isArray(eqs) && eqs.length > 0 ? eqs : MOCK_EQUIPES;

      setEquipes(validEquipes);
      setPerfis(validPerfis);
      setConfig(cfg || MOCK_CONFIGURACAO);
      setSolicitacoes(Array.isArray(sols) ? sols : []);
      setHistorico(Array.isArray(hist) ? hist : []);

      const savedUserId = getActiveUserId();
      const foundUser = validPerfis.find(p => p.id === savedUserId) || validPerfis[0];
      if (foundUser) {
        setCurrentUser(foundUser);
      }
    } catch (e: any) {
      console.warn('Erro ao carregar dados:', e);
      setLoadError(e?.message || 'Falha na inicialização');
      const fallbackPerfis = generateMockPoliciais();
      setPerfis(fallbackPerfis);
      setEquipes(MOCK_EQUIPES);
      setCurrentUser(fallbackPerfis[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Failsafe: se demorar mais de 1.5s, libera a tela imediatamente
    const failsafeTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    // Sincronizar hash inicial da URL
    const hash = window.location.hash.replace('#', '');
    if (hash && ['calendario', 'minhas-ferias', 'direcao', 'admin', 'relatorios', 'regras'].includes(hash)) {
      setActiveTabState(hash);
    }

    return () => clearTimeout(failsafeTimer);
  }, [loadData]);

  const handleSelectUser = (user: Perfil) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
  };

  // Se estiver carregando pela primeira vez e não houver usuário
  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-navy-950 flex items-center justify-center shadow-xl border border-navy-800 animate-pulse">
          <span className="font-black text-2xl text-gold-400">PP</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-navy-950">FÉRIAS PP</h2>
          <p className="text-xs text-slate-500 mt-1">Carregando sistema de planejamento de férias da unidade...</p>
        </div>
        <RefreshCw className="w-5 h-5 text-gold-600 animate-spin" />
        <button
          onClick={() => setLoading(false)}
          className="mt-4 text-xs font-bold text-navy-800 bg-white border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-xl shadow-sm transition"
        >
          Entrar Imediatamente
        </button>
      </div>
    );
  }

  const currentUserTeam = equipes.find(e => e.id === currentUser.equipeId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-navy-900 selection:text-gold-300">
      {/* Barra de Navegação Superior */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allPerfis={perfis}
        onSelectUser={handleSelectUser}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'calendario' && (
          <MasterCalendar
            solicitacoes={solicitacoes}
            equipes={equipes}
            perfis={perfis}
          />
        )}

        {activeTab === 'minhas-ferias' && (
          <VacationWizard
            currentUser={currentUser}
            userTeam={currentUserTeam}
            allSolicitacoes={solicitacoes}
            config={config}
            onSolicitacaoCreated={loadData}
          />
        )}

        {activeTab === 'direcao' && (
          <DirectorPanel
            currentUser={currentUser}
            solicitacoes={solicitacoes}
            equipes={equipes}
            perfis={perfis}
            historico={historico}
            onDataUpdated={loadData}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            perfis={perfis}
            equipes={equipes}
            config={config}
            onDataUpdated={loadData}
          />
        )}

        {activeTab === 'relatorios' && (
          <SapReportsTab
            solicitacoes={solicitacoes}
            equipes={equipes}
            perfis={perfis}
            anoAtual={config.anoExercicio}
          />
        )}

        {activeTab === 'regras' && (
          <RulesHelpTab config={config} />
        )}
      </main>

      {/* Rodapé Institucional */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-navy-950 flex items-center justify-center text-gold-400 font-bold text-xs">
              PP
            </div>
            <div>
              <p className="font-bold text-navy-950">FÉRIAS PP — Sistema de Planejamento de Férias</p>
              <p className="text-[11px] text-slate-400">Unidade Prisional | Controle Interno e Relatórios para a SAP</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
              Custo Zero: React + Supabase + GitHub Pages
            </span>
            <button
              onClick={() => setSupabaseModalOpen(true)}
              className="text-navy-700 hover:text-navy-950 font-bold hover:underline"
            >
              Conexão com Banco de Dados
            </button>
          </div>
        </div>
      </footer>

      {/* Modal de Conexão com Supabase */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onCredentialsUpdated={loadData}
      />
    </div>
  );
}

export default App;

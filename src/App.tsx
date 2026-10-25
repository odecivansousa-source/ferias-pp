import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MasterCalendar } from './components/MasterCalendar';
import { VacationWizard } from './components/VacationWizard';
import { DirectorPanel } from './components/DirectorPanel';
import { AdminPanel } from './components/AdminPanel';
import { SapReportsTab } from './components/SapReportsTab';
import { RulesHelpTab } from './components/RulesHelpTab';
import { SupabaseModal } from './components/SupabaseModal';
import { LoginScreen } from './components/LoginScreen';

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
import { getSupabaseClient } from './services/supabase';
import { RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTabState] = useState<string>('minhas-ferias');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [config, setConfig] = useState<ConfiguracaoFerias>(MOCK_CONFIGURACAO);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoFerias[]>([]);
  const [historico, setHistorico] = useState<HistoricoAuditoria[]>([]);

  // Carrega usuário autenticado salvo pela matrícula
  const [currentUser, setCurrentUser] = useState<Perfil | null>(() => {
    try {
      const savedMat = localStorage.getItem('ferias_pp_logged_matricula');
      if (savedMat) {
        const rawPerfis = localStorage.getItem('ferias_pp_perfis');
        const list: Perfil[] = rawPerfis ? JSON.parse(rawPerfis) : generateMockPoliciais();
        const found = list.find(p => p.matricula.toUpperCase() === savedMat.toUpperCase());
        if (found) return found;
      }
    } catch(e) {}
    return null;
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

      const savedMat = localStorage.getItem('ferias_pp_logged_matricula');
      if (savedMat) {
        const foundUser = validPerfis.find(p => p.matricula.toUpperCase() === savedMat.toUpperCase());
        if (foundUser && foundUser.situacao !== 'inativo') {
          setCurrentUser(foundUser);
        } else {
          // Servidor foi excluído ou inativado pela Direção: desloga imediatamente
          localStorage.removeItem('ferias_pp_logged_matricula');
          setCurrentUser(null);
        }
      }
    } catch (e: any) {
      console.warn('Erro ao carregar dados:', e);
      setLoadError(e?.message || 'Falha na inicialização');
      const fallbackPerfis = generateMockPoliciais();
      setPerfis(fallbackPerfis);
      setEquipes(MOCK_EQUIPES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Failsafe: libera loading após 1.2s
    const failsafeTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    // Sincronizar hash inicial da URL se já logado
    const hash = window.location.hash.replace('#', '');
    if (hash && ['calendario', 'minhas-ferias', 'direcao', 'admin', 'relatorios', 'regras'].includes(hash)) {
      setActiveTabState(hash);
    }

    // -------------------------------------------------------------------------
    // COMUNICAÇÃO EM TEMPO REAL SUPABASE (WebSockets + Polling Ativo + Foco)
    // -------------------------------------------------------------------------
    const supabase = getSupabaseClient();
    let channel: any = null;

    if (supabase) {
      try {
        channel = supabase
          .channel('realtime_ferias_pp')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'perfis' }, () => {
            console.log('⚡ [TEMPO REAL] Policiais atualizados no Supabase');
            loadData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_ferias' }, () => {
            console.log('⚡ [TEMPO REAL] Solicitação atualizada no Supabase');
            loadData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'periodos_ferias' }, () => {
            console.log('⚡ [TEMPO REAL] Períodos atualizados no Supabase');
            loadData();
          })
          .subscribe();
      } catch (err) {
        console.warn('Erro ao conectar realtime:', err);
      }
    }

    // Heartbeat automático: sincroniza a cada 4 segundos garantindo tempo real mesmo se o celular suspender o websocket
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 4000);

    // Ao desbloquear o celular ou focar na aba
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearTimeout(failsafeTimer);
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  const handleLoginSuccess = (user: Perfil) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
    localStorage.setItem('ferias_pp_logged_matricula', user.matricula);

    setPerfis(prev => {
      if (!prev.find(p => p.matricula === user.matricula)) {
        return [...prev, user];
      }
      return prev;
    });

    if (user.papel === 'policial') {
      setActiveTab('minhas-ferias');
    } else {
      // Diretor da Unidade com acesso total é direcionado para a gestão e decisões
      setActiveTab('direcao');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ferias_pp_logged_matricula');
    setCurrentUser(null);
  };

  const handleSelectUser = (user: Perfil) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
    localStorage.setItem('ferias_pp_logged_matricula', user.matricula);
  };

  // Se estiver carregando inicialmente
  if (loading && perfis.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-navy-950 flex items-center justify-center shadow-xl border border-navy-800 animate-pulse">
          <span className="font-black text-2xl text-gold-400">PP</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-navy-950">FÉRIAS PP</h2>
          <p className="text-xs text-slate-500 mt-1">Carregando quadro funcional da unidade...</p>
        </div>
        <RefreshCw className="w-5 h-5 text-gold-600 animate-spin" />
      </div>
    );
  }

  // TELA DE LOGIN OBRIGATÓRIA: se não houver policial autenticado, pede a matrícula
  if (!currentUser) {
    return (
      <LoginScreen
        perfis={perfis.length > 0 ? perfis : generateMockPoliciais()}
        onLoginSuccess={handleLoginSuccess}
      />
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
        onLogout={handleLogout}
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
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-navy-950 flex items-center justify-center text-gold-400 font-bold text-xs">
              PP
            </div>
            <div>
              <p className="font-bold text-navy-950">FÉRIAS PP — Sistema de Planejamento de Férias</p>
              <p className="text-[11px] text-slate-400">Unidade Prisional | Controle Interno de Escala e Relatórios</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Ambiente Interno da Unidade Prisional
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

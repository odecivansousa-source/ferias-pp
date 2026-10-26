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
import { RefreshCw, ShieldAlert } from 'lucide-react';

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

  const isDiretor = currentUser ? (currentUser.papel === 'diretor' || (currentUser.papel as string) === 'admin') : false;

  // Sincronização com o Hash da URL com verificação estrita de controle de acesso (RBAC)
  const setActiveTab = (tab: string) => {
    const isUserDiretor = currentUser ? (currentUser.papel === 'diretor' || (currentUser.papel as string) === 'admin') : false;
    const restrictedTabs = ['direcao', 'admin', 'relatorios'];
    if (restrictedTabs.includes(tab) && !isUserDiretor) {
      setActiveTabState('minhas-ferias');
      window.location.hash = 'minhas-ferias';
      return;
    }
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

      setEquipes(prev => JSON.stringify(prev) === JSON.stringify(validEquipes) ? prev : validEquipes);
      setPerfis(prev => JSON.stringify(prev) === JSON.stringify(validPerfis) ? prev : validPerfis);
      setConfig(prev => JSON.stringify(prev) === JSON.stringify(cfg || MOCK_CONFIGURACAO) ? prev : (cfg || MOCK_CONFIGURACAO));
      setSolicitacoes(prev => JSON.stringify(prev) === JSON.stringify(sols) ? prev : (Array.isArray(sols) ? sols : []));
      setHistorico(prev => JSON.stringify(prev) === JSON.stringify(hist) ? prev : (Array.isArray(hist) ? hist : []));

      const savedMat = localStorage.getItem('ferias_pp_logged_matricula');
      if (savedMat) {
        const cleanSaved = savedMat.trim().toUpperCase();
        const foundUser = validPerfis.find(p => p.matricula.trim().toUpperCase() === cleanSaved);
        if (foundUser) {
          if (foundUser.situacao === 'inativo') {
            localStorage.removeItem('ferias_pp_logged_matricula');
            setCurrentUser(null);
          } else {
            setCurrentUser(prev => {
              if (prev && prev.id === foundUser.id && prev.nomeCompleto === foundUser.nomeCompleto && prev.matricula === foundUser.matricula && prev.papel === foundUser.papel && prev.situacao === foundUser.situacao && prev.equipeId === foundUser.equipeId) {
                return prev;
              }
              return foundUser;
            });
          }
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

    // Sincronizar hash inicial da URL com validação de abas públicas
    const hash = window.location.hash.replace('#', '');
    const publicTabs = ['calendario', 'minhas-ferias', 'regras'];
    if (hash && publicTabs.includes(hash)) {
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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'equipes' }, () => {
            console.log('⚡ [TEMPO REAL] Equipes atualizadas no Supabase');
            loadData();
          })
          .subscribe();
      } catch (err) {
        console.warn('Erro ao conectar realtime:', err);
      }
    }

    // Heartbeat automático: sincroniza a cada 8 segundos garantindo tempo real mesmo se o celular suspender o websocket
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 8000);

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

  // Proteção estrita em tempo de execução: se o usuário logado não for diretor, bloqueia abas de gestão
  useEffect(() => {
    if (!currentUser) return;
    const isUserDiretor = currentUser.papel === 'diretor' || (currentUser.papel as string) === 'admin';
    const restrictedTabs = ['direcao', 'admin', 'relatorios'];
    if (!isUserDiretor && restrictedTabs.includes(activeTab)) {
      setActiveTabState('minhas-ferias');
      window.location.hash = 'minhas-ferias';
    }
  }, [currentUser, activeTab]);

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
        <img
          src="./apple-touch-icon.png"
          alt="Férias PP"
          className="w-20 h-20 rounded-3xl shadow-xl border-2 border-gold-400/40 animate-pulse object-cover"
        />
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
          isDiretor ? (
            <DirectorPanel
              currentUser={currentUser}
              solicitacoes={solicitacoes}
              equipes={equipes}
              perfis={perfis}
              historico={historico}
              onDataUpdated={loadData}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 bg-white p-6 rounded-3xl border border-rose-200 shadow-xl text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-navy-950">Acesso Restrito à Direção</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Esta seção é restrita aos Diretores da Unidade Prisional. Seu perfil funcional não possui autorização para este módulo.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('minhas-ferias')}
                className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs rounded-xl transition shadow"
              >
                Voltar para Minhas Férias
              </button>
            </div>
          )
        )}

        {activeTab === 'admin' && (
          isDiretor ? (
            <AdminPanel
              perfis={perfis}
              equipes={equipes}
              config={config}
              onDataUpdated={loadData}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 bg-white p-6 rounded-3xl border border-rose-200 shadow-xl text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-navy-950">Acesso Restrito à Direção</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Esta seção é restrita aos Diretores da Unidade Prisional. Seu perfil funcional não possui autorização para este módulo.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('minhas-ferias')}
                className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs rounded-xl transition shadow"
              >
                Voltar para Minhas Férias
              </button>
            </div>
          )
        )}

        {activeTab === 'relatorios' && (
          isDiretor ? (
            <SapReportsTab
              solicitacoes={solicitacoes}
              equipes={equipes}
              perfis={perfis}
              anoAtual={config.anoExercicio}
            />
          ) : (
            <div className="max-w-md mx-auto my-12 bg-white p-6 rounded-3xl border border-rose-200 shadow-xl text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-navy-950">Acesso Restrito à Direção</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Esta seção é restrita aos Diretores da Unidade Prisional. Seu perfil funcional não possui autorização para este módulo.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('minhas-ferias')}
                className="w-full py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs rounded-xl transition shadow"
              >
                Voltar para Minhas Férias
              </button>
            </div>
          )
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

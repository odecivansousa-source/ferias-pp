import React from 'react';
import { 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Settings, 
  FileSpreadsheet, 
  HelpCircle, 
  Database, 
  UserCheck, 
  Users,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Perfil, PapelUsuario } from '../types';
import { isSupabaseConnected } from '../services/supabase';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Perfil;
  allPerfis: Perfil[];
  onSelectUser: (user: Perfil) => void;
  onOpenSupabaseModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allPerfis,
  onSelectUser,
  onOpenSupabaseModal,
}) => {
  const isConnected = isSupabaseConnected();

  // Filtrar usuários de exemplo para o seletor rápido
  const policiais = allPerfis.filter(p => p.papel === 'policial').slice(0, 5);
  const diretores = allPerfis.filter(p => p.papel === 'diretor');
  const admins = allPerfis.filter(p => p.papel === 'admin');

  const navItems = [
    { id: 'calendario', label: 'Calendário de Férias', icon: Calendar, minRole: 'policial' },
    { id: 'minhas-ferias', label: 'Minhas Férias', icon: FileText, minRole: 'policial' },
    { id: 'direcao', label: 'Painel da Direção', icon: ShieldCheck, minRole: 'diretor' },
    { id: 'admin', label: 'Administração', icon: Settings, minRole: 'admin' },
    { id: 'relatorios', label: 'Relatórios para SAP', icon: FileSpreadsheet, minRole: 'diretor' },
    { id: 'regras', label: 'Regras & Normas', icon: HelpCircle, minRole: 'policial' },
  ];

  const canAccess = (minRole: string): boolean => {
    if (currentUser.papel === 'admin') return true;
    if (currentUser.papel === 'diretor') return minRole !== 'admin';
    return minRole === 'policial';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      {/* Faixa Superior Institucional */}
      <div className="bg-navy-950 text-white text-[11px] px-4 py-1.5 flex items-center justify-between border-b border-navy-900">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-gold-400"></span>
          <span className="font-semibold tracking-wide text-slate-300">ESTADO DE SÃO PAULO — SECRETARIA DA ADMINISTRAÇÃO PENITENCIÁRIA</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status do Banco / Supabase */}
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
              isConnected
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                : 'bg-amber-950/80 text-gold-300 border border-gold-700/60 hover:bg-amber-900'
            }`}
            title="Clique para configurar o banco de dados Supabase"
          >
            <Database className="w-3 h-3" />
            <span>{isConnected ? 'Supabase Nuvem Ativo' : '⚡ Modo Demo Local (120 Policiais)'}</span>
          </button>
        </div>
      </div>

      {/* Barra Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Identidade Visual */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('calendario')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-900 to-navy-950 flex items-center justify-center text-gold-400 shadow-md border border-navy-800">
              <span className="font-black text-xl tracking-tighter">PP</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-navy-950 tracking-tight leading-tight">FÉRIAS PP</h1>
                <span className="bg-gold-100 text-gold-800 font-extrabold text-[10px] px-1.5 py-0.5 rounded border border-gold-200">
                  UNIDADE
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-none">Sistema de Planejamento de Férias</p>
            </div>
          </div>

          {/* Seletor de Perfil / Usuário Atual (Essencial para testes e demonstração) */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="flex items-center gap-2.5 bg-slate-100/80 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer transition">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                  currentUser.papel === 'admin' ? 'bg-purple-600' : currentUser.papel === 'diretor' ? 'bg-navy-800' : 'bg-emerald-600'
                }`}>
                  {currentUser.papel === 'admin' ? 'A' : currentUser.papel === 'diretor' ? 'D' : 'P'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-navy-950 truncate max-w-[170px] leading-tight">
                    {currentUser.nomeCompleto}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1">
                    <span>{currentUser.papel}</span>
                    <span>•</span>
                    <span className="font-mono text-[9px]">{currentUser.matricula}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Dropdown de Troca Rápida de Usuário */}
              <div className="absolute right-0 mt-1 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 hidden group-hover:block animate-fadeIn z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Simulador de Acesso Rápido
                </div>

                <div className="p-1 space-y-0.5">
                  <div className="px-2 pt-1 text-[10px] font-bold text-purple-700">Administração Geral</div>
                  {admins.map(adm => (
                    <button
                      key={adm.id}
                      onClick={() => onSelectUser(adm)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        currentUser.id === adm.id ? 'bg-purple-50 font-bold text-purple-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{adm.nomeCompleto}</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-1 rounded">Admin</span>
                    </button>
                  ))}

                  <div className="px-2 pt-2 text-[10px] font-bold text-navy-800">Diretoria da Unidade</div>
                  {diretores.map(dir => (
                    <button
                      key={dir.id}
                      onClick={() => onSelectUser(dir)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        currentUser.id === dir.id ? 'bg-navy-50 font-bold text-navy-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{dir.nomeCompleto}</span>
                      <span className="text-[10px] bg-navy-100 text-navy-800 px-1 rounded">Diretor</span>
                    </button>
                  ))}

                  <div className="px-2 pt-2 text-[10px] font-bold text-emerald-700">Policiais Penais (Amostra)</div>
                  {policiais.map(pol => (
                    <button
                      key={pol.id}
                      onClick={() => onSelectUser(pol)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        currentUser.id === pol.id ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{pol.nomeCompleto}</span>
                      <span className="text-[9px] font-mono text-slate-400">{pol.matricula}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação */}
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1 border-t border-slate-100">
          {navItems.map(item => {
            const visible = canAccess(item.minRole);
            if (!visible) return null;

            const Icon = item.icon;
            const active = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-gold-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

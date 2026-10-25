import React, { useState } from 'react';
import { 
  Settings, 
  Users, 
  UserPlus, 
  Edit3, 
  Shield, 
  Sliders, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Save,
  X
} from 'lucide-react';
import { Perfil, Equipe, ConfiguracaoFerias, PapelUsuario, SituacaoFuncional } from '../types';
import { savePerfil, updateEquipe, updateConfiguracao, resetDemoData } from '../services/dataService';

interface AdminPanelProps {
  perfis: Perfil[];
  equipes: Equipe[];
  config: ConfiguracaoFerias;
  onDataUpdated: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  perfis,
  equipes,
  config,
  onDataUpdated,
}) => {
  const [subTab, setSubTab] = useState<'policiais' | 'equipes' | 'regras'>('policiais');
  const [search, setSearch] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('TODAS');
  const [filterPapel, setFilterPapel] = useState('TODOS');

  // Modal de Adicionar/Editar Policial
  const [modalPerfil, setModalPerfil] = useState<Partial<Perfil> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edição de Equipes
  const [equipesState, setEquipesState] = useState<Equipe[]>(equipes);

  // Edição de Configurações
  const [configState, setConfigState] = useState<ConfiguracaoFerias>(config);

  const policiaisFiltrados = perfis.filter(p => {
    if (filterEquipe !== 'TODAS' && p.equipeId !== filterEquipe) return false;
    if (filterPapel !== 'TODOS' && p.papel !== filterPapel) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.nomeCompleto.toLowerCase().includes(q) || p.matricula.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenAddModal = () => {
    setModalPerfil({
      id: '',
      nomeCompleto: '',
      matricula: '',
      equipeId: equipes[0]?.id || '',
      papel: 'policial',
      situacao: 'ativo',
      email: '',
      telefone: '',
    });
    setIsEditing(false);
    setFeedback(null);
  };

  const handleOpenEditModal = (p: Perfil) => {
    setModalPerfil({ ...p });
    setIsEditing(true);
    setFeedback(null);
  };

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPerfil || !modalPerfil.nomeCompleto || !modalPerfil.matricula) return;

    setSalvando(true);
    try {
      const perfilToSave: Perfil = {
        id: modalPerfil.id || 'pol-' + Date.now(),
        nomeCompleto: modalPerfil.nomeCompleto.trim(),
        matricula: modalPerfil.matricula.trim().toUpperCase(),
        equipeId: modalPerfil.equipeId || equipes[0]?.id,
        papel: (modalPerfil.papel as PapelUsuario) || 'policial',
        situacao: (modalPerfil.situacao as SituacaoFuncional) || 'ativo',
        email: modalPerfil.email,
        telefone: modalPerfil.telefone,
      };

      await savePerfil(perfilToSave);
      setFeedback('Perfil salvo com sucesso!');
      setTimeout(() => {
        setModalPerfil(null);
        onDataUpdated();
      }, 800);
    } catch (err: any) {
      setFeedback(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleSaveEquipe = async (eq: Equipe) => {
    try {
      await updateEquipe(eq);
      alert(`Equipe "${eq.nome}" atualizada com sucesso!`);
      onDataUpdated();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfiguracao(configState);
      alert('Configurações gerais atualizadas com sucesso!');
      onDataUpdated();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleResetDemo = () => {
    if (confirm('Tem certeza de que deseja restaurar os 120 policiais fictícios e solicitações de demonstração? Isso redefinirá os dados locais.')) {
      resetDemoData();
      alert('Dados de demonstração restaurados!');
      onDataUpdated();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Subnavegação da Administração */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('policiais')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition ${
              subTab === 'policiais' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Cadastro de Policiais ({perfis.length})</span>
          </button>

          <button
            onClick={() => setSubTab('equipes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition ${
              subTab === 'equipes' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Equipes & Limites ({equipes.length})</span>
          </button>

          <button
            onClick={() => setSubTab('regras')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition ${
              subTab === 'regras' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Regras do Exercício</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetDemo}
          className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-2xl transition flex items-center gap-1.5"
          title="Restaura os 120 policiais fictícios"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Base Demo (120 Policiais)</span>
        </button>
      </div>

      {/* Sub-Aba 1: Relação de Policiais (~120 Policiais) */}
      {subTab === 'policiais' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-lg font-black text-navy-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-600" />
                Quadro de Policiais Penais da Unidade
              </h3>
              <p className="text-xs text-slate-500">Gestão dos servidores, lotação em equipes e perfis de acesso</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

              {/* Filtro Papel */}
              <select
                value={filterPapel}
                onChange={(e) => setFilterPapel(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-xs font-bold text-navy-950 px-3 py-2 rounded-2xl outline-none"
              >
                <option value="TODOS">Todos os Servidores</option>
                <option value="policial">Policiais Penais</option>
                <option value="diretor">Direção da Unidade</option>
              </select>

              {/* Busca */}
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nome ou matrícula..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-2xl outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="text-xs font-black text-white bg-navy-900 hover:bg-navy-800 px-4 py-2 rounded-2xl shadow-sm transition flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-gold-400" />
                Cadastrar Policial
              </button>
            </div>
          </div>

          {/* Tabela de Policiais */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-3">Matrícula</th>
                  <th className="py-3 px-3">Nome Completo</th>
                  <th className="py-3 px-3">Equipe</th>
                  <th className="py-3 px-3">Perfil</th>
                  <th className="py-3 px-3">Situação</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policiaisFiltrados.slice(0, 100).map(p => {
                  const eq = equipes.find(e => e.id === p.equipeId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{p.matricula}</td>
                      <td className="py-3 px-3 font-semibold text-navy-950">{p.nomeCompleto}</td>
                      <td className="py-3 px-3 text-slate-600">{eq?.nome || '-'}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          (p.papel === 'diretor' || (p.papel as string) === 'admin') 
                            ? 'bg-navy-900 text-gold-400 font-black' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {(p.papel === 'diretor' || (p.papel as string) === 'admin') ? 'Diretor da Unidade' : 'Policial Penal'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.situacao === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.situacao}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          className="text-xs text-navy-700 hover:text-navy-950 font-bold hover:underline"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Aba 2: Configuração das 4 Equipes & Limites */}
      {subTab === 'equipes' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-navy-950 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold-600" />
              Equipes de Plantão & Limites de Afastamento
            </h3>
            <p className="text-xs text-slate-500">
              Configure o limite máximo de afastamentos simultâneos e o efetivo mínimo de segurança de cada equipe
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {equipesState.map((eq, idx) => (
              <div key={eq.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border">
                    {eq.codigo}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Ativa
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-950 mb-1">Nome da Equipe:</label>
                    <input
                      type="text"
                      value={eq.nome}
                      onChange={(e) => {
                        const copy = [...equipesState];
                        copy[idx] = { ...copy[idx], nome: e.target.value };
                        setEquipesState(copy);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-navy-950 mb-1">
                        Limite Afastados Simultâneos:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={eq.limiteAfastamentosSimultaneos}
                        onChange={(e) => {
                          const copy = [...equipesState];
                          copy[idx] = { ...copy[idx], limiteAfastamentosSimultaneos: Number(e.target.value) };
                          setEquipesState(copy);
                        }}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-navy-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-navy-950 mb-1">
                        Efetivo Mínimo Requerido:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={eq.efetivoMinimoRequerido}
                        onChange={(e) => {
                          const copy = [...equipesState];
                          copy[idx] = { ...copy[idx], efetivoMinimoRequerido: Number(e.target.value) };
                          setEquipesState(copy);
                        }}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-navy-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSaveEquipe(eq)}
                    className="text-xs font-black text-white bg-navy-900 hover:bg-navy-800 px-4 py-2 rounded-xl transition flex items-center gap-1.5 ml-auto"
                  >
                    <Save className="w-3.5 h-3.5 text-gold-400" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Aba 3: Regras Gerais do Exercício */}
      {subTab === 'regras' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6 max-w-2xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-navy-950 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-gold-600" />
              Configuração das Regras Anuais de Férias
            </h3>
            <p className="text-xs text-slate-500">Defina o período anual de submissão e prazos da unidade</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Ano de Exercício:</label>
                <input
                  type="number"
                  value={configState.anoExercicio}
                  onChange={(e) => setConfigState({ ...configState, anoExercicio: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Antecedência Mínima (dias):</label>
                <input
                  type="number"
                  value={configState.antecedenciaMinimaDias}
                  onChange={(e) => setConfigState({ ...configState, antecedenciaMinimaDias: Number(e.target.value) })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Abertura de Solicitações:</label>
                <input
                  type="date"
                  value={configState.aberturaSolicitacoes}
                  onChange={(e) => setConfigState({ ...configState, aberturaSolicitacoes: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Fechamento de Solicitações:</label>
                <input
                  type="date"
                  value={configState.fechamentoSolicitacoes}
                  onChange={(e) => setConfigState({ ...configState, fechamentoSolicitacoes: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-6 rounded-2xl font-black text-xs text-white bg-navy-900 hover:bg-navy-800 shadow-md transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4 text-gold-400" />
                Salvar Regras do Exercício
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Cadastrar / Editar Policial */}
      {modalPerfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {isEditing ? 'Editar Policial Penal' : 'Cadastrar Novo Policial'}
              </h3>
              <button onClick={() => setModalPerfil(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerfil} className="p-6 space-y-4">
              {feedback && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold">
                  {feedback}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={modalPerfil.nomeCompleto || ''}
                  onChange={(e) => setModalPerfil({ ...modalPerfil, nomeCompleto: e.target.value })}
                  placeholder="Ex: Carlos Eduardo da Silva"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Matrícula Funcional *</label>
                <input
                  type="text"
                  required
                  value={modalPerfil.matricula || ''}
                  onChange={(e) => setModalPerfil({ ...modalPerfil, matricula: e.target.value })}
                  placeholder="Ex: PP-2026-121"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-navy-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Equipe de Lotação</label>
                  <select
                    value={modalPerfil.equipeId || ''}
                    onChange={(e) => setModalPerfil({ ...modalPerfil, equipeId: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none"
                  >
                    {equipes.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Perfil de Acesso</label>
                  <select
                    value={modalPerfil.papel || 'policial'}
                    onChange={(e) => setModalPerfil({ ...modalPerfil, papel: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none"
                  >
                    <option value="policial">Policial Penal</option>
                    <option value="diretor">Diretor da Unidade</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Situação Funcional</label>
                <select
                  value={modalPerfil.situacao || 'ativo'}
                  onChange={(e) => setModalPerfil({ ...modalPerfil, situacao: e.target.value as any })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo / Afastado</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalPerfil(null)}
                  className="text-xs font-bold text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="text-xs font-black text-white bg-navy-900 hover:bg-navy-800 px-5 py-2 rounded-xl shadow-md transition"
                >
                  {salvando ? 'Salvando...' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

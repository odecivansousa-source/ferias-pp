import React, { useState } from 'react';
import { Shield, KeyRound, Check, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Perfil } from '../types';
import { getDiretorSenha, salvarDadosDiretor } from '../services/dataService';

interface DirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  diretorPerfil?: Perfil | null;
  onDataUpdated: () => void;
}

export const DirectorModal: React.FC<DirectorModalProps> = ({
  isOpen,
  onClose,
  diretorPerfil,
  onDataUpdated,
}) => {
  const [nomeCompleto, setNomeCompleto] = useState(diretorPerfil?.nomeCompleto || 'PEDRO');
  const [matricula, setMatricula] = useState(diretorPerfil?.matricula || '123');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Sincroniza campos APENAS quando o modal é aberto (impede sobrescrever digitação pelo polling em tempo real)
  const prevOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setNomeCompleto(diretorPerfil?.nomeCompleto || 'PEDRO');
      setMatricula(diretorPerfil?.matricula || '123');
      setNovaSenha('');
      setConfirmarSenha('');
      setMostrarSenha(false);
      setMensagem(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, diretorPerfil?.id]);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    const nome = nomeCompleto.trim();
    const mat = matricula.trim().toUpperCase();

    if (!nome) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, informe o nome completo do Diretor.' });
      return;
    }

    if (!mat) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, informe a matrícula funcional do Diretor.' });
      return;
    }

    if (novaSenha.trim()) {
      if (novaSenha.trim() !== confirmarSenha.trim()) {
        setMensagem({ tipo: 'erro', texto: 'A nova senha e a confirmação não conferem.' });
        return;
      }
    }

    setSalvando(true);
    try {
      await salvarDadosDiretor(nome, mat, novaSenha.trim() || undefined);
      setMensagem({
        tipo: 'ok',
        texto: 'Dados e senha do Diretor atualizados com sucesso!',
      });
      setTimeout(() => {
        onDataUpdated();
        onClose();
      }, 1200);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scaleIn">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-850 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Dados de Acesso da Direção</h3>
              <p className="text-xs text-slate-300">
                Cadastrar Nome, Matrícula e Senha Exclusiva do Diretor
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="p-6 space-y-4 text-xs">
          <div className="bg-gold-50/70 border border-gold-200 p-3 rounded-2xl text-gold-950 text-[11px] leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-gold-900 mb-0.5">
              <Shield className="w-3.5 h-3.5" />
              Acesso Exclusivo por Senha
            </div>
            O Diretor é o <strong>único usuário</strong> que utiliza senha no sistema. Os Policiais Penais acessam diretamente por matrícula funcional. Senha de teste inicial: <strong>131220</strong>.
          </div>

          <div>
            <label className="block font-black text-navy-950 uppercase tracking-wider mb-1.5">
              Nome Completo do Diretor:
            </label>
            <input
              type="text"
              required
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Ex: Diretor Dr. Carlos Silva"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-navy-900 rounded-xl outline-none text-navy-950 font-bold"
            />
          </div>

          <div>
            <label className="block font-black text-navy-950 uppercase tracking-wider mb-1.5">
              Matrícula Funcional do Diretor:
            </label>
            <input
              type="text"
              required
              value={matricula}
              onChange={(e) => setMatricula(e.target.value.toUpperCase())}
              placeholder="Ex: 123 ou matrícula oficial"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-navy-900 rounded-xl outline-none font-mono font-bold text-navy-950"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Utilizada como login de acesso na tela inicial.
            </span>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div>
              <label className="block font-black text-navy-950 uppercase tracking-wider mb-1.5">
                Nova Senha de Acesso:
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Deixe em branco para manter a senha atual"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 focus:border-navy-900 rounded-xl outline-none font-mono font-bold text-navy-950"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-900 transition"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {novaSenha.trim() && (
              <div className="animate-fadeIn">
                <label className="block font-black text-navy-950 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha:
                </label>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha para confirmação"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-navy-900 rounded-xl outline-none font-mono font-bold text-navy-950"
                />
              </div>
            )}
          </div>

          {mensagem && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 animate-fadeIn ${
                mensagem.tipo === 'ok'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {mensagem.tipo === 'ok' ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-semibold">{mensagem.texto}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 text-white font-black shadow-md flex items-center gap-2 transition"
            >
              {salvando ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-gold-400" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Perfil } from '../types';

interface LoginScreenProps {
  perfis: Perfil[];
  onLoginSuccess: (user: Perfil) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ perfis, onLoginSuccess }) => {
  const [matriculaInput, setMatriculaInput] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const termo = matriculaInput.trim().toUpperCase();
    if (!termo) {
      setErro('Por favor, informe sua matrícula funcional.');
      return;
    }

    // Busca apenas por matrícula de servidor cadastrado no sistema
    const encontrado = perfis.find(p => {
      const mat = p.matricula.trim().toUpperCase();
      if (mat === termo) return true;
      if (mat.replace(/[^A-Z0-9]/g, '') === termo.replace(/[^A-Z0-9]/g, '')) return true;
      return false;
    });

    if (!encontrado) {
      setErro(`Matrícula "${matriculaInput}" não cadastrada no sistema. O acesso é permitido somente para servidores previamente cadastrados pela Direção da Unidade.`);
      return;
    }

    if (encontrado.situacao === 'inativo') {
      setErro('Servidor com situação funcional inativa ou afastada. Contate a Direção da unidade.');
      return;
    }

    onLoginSuccess(encontrado);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-navy-900 selection:text-gold-300">
      {/* Topo Institucional */}
      <div className="bg-navy-950 text-white text-[11px] px-4 py-2 flex items-center justify-between border-b border-navy-900">
        <span className="font-semibold tracking-wide text-slate-300">
          UNIDADE PRISIONAL — CONTROLE DE EFETIVO
        </span>
        <span className="text-gold-400 font-bold">FÉRIAS PP</span>
      </div>

      {/* Card Central de Login */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-fadeIn">
          {/* Header do Card */}
          <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 border border-gold-500/40 text-gold-400 font-black text-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
              PP
            </div>
            <h1 className="font-black text-2xl tracking-tight text-white">FÉRIAS PP</h1>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Sistema de Planejamento e Controle de Férias
            </p>
            <div className="mt-3 inline-block bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Acesso Funcional da Unidade
            </div>
          </div>

          {/* Formulário de Acesso por Matrícula */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-navy-950 uppercase tracking-wider mb-2">
                  Informe sua Matrícula Funcional:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={matriculaInput}
                    onChange={(e) => {
                      setMatriculaInput(e.target.value);
                      setErro(null);
                    }}
                    placeholder="Digite sua matrícula funcional"
                    className="w-full text-sm font-mono font-bold px-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-navy-900 rounded-2xl outline-none text-navy-950 transition shadow-inner"
                  />
                </div>
              </div>

              {erro && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{erro}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white bg-navy-950 hover:bg-navy-900 active:scale-[0.99] shadow-lg shadow-navy-950/20 transition flex items-center justify-center gap-2"
              >
                <span>Acessar o Sistema</span>
                <ArrowRight className="w-4 h-4 text-gold-400" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        FÉRIAS PP — Sistema de Planejamento e Controle de Férias da Unidade Prisional
      </footer>
    </div>
  );
};

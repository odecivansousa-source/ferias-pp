import React, { useState } from 'react';
import { ArrowRight, AlertCircle, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Perfil } from '../types';
import { getDiretorSenha, getPerfis, normalizeEquipeId, verificarSenhaDiretor } from '../services/dataService';
import { getSupabaseClient } from '../services/supabase';

interface LoginScreenProps {
  perfis: Perfil[];
  onLoginSuccess: (user: Perfil) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ perfis, onLoginSuccess }) => {
  const [matriculaInput, setMatriculaInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  // Verifica se a matrícula informada pertence ao Diretor da Unidade
  const termoMatricula = matriculaInput.trim().toUpperCase();
  const servidorEncontrado = termoMatricula
    ? perfis.find(p => {
        const mat = p.matricula.trim().toUpperCase();
        if (mat === termoMatricula) return true;
        if (mat.replace(/[^A-Z0-9]/g, '') === termoMatricula.replace(/[^A-Z0-9]/g, '')) return true;
        return false;
      })
    : null;

  const isDiretor = servidorEncontrado
    ? servidorEncontrado.papel === 'diretor' || (servidorEncontrado.papel as string) === 'admin'
    : false;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const termo = matriculaInput.trim().toUpperCase();
    if (!termo) {
      setErro('Por favor, informe sua matrícula funcional.');
      return;
    }

    let targetUser = servidorEncontrado;

    // Se não encontrou de imediato no cache do aparelho, consulta o Supabase em tempo real
    if (!targetUser) {
      try {
        setVerificando(true);
        const atualizados = await getPerfis();
        targetUser = atualizados.find(p => {
          const mat = p.matricula.trim().toUpperCase();
          if (mat === termo) return true;
          if (mat.replace(/[^A-Z0-9]/g, '') === termo.replace(/[^A-Z0-9]/g, '')) return true;
          return false;
        }) || null;

        // Se ainda não encontrou via getPerfis, busca diretamente no Supabase por matrícula (apenas campos públicos)
        if (!targetUser) {
          const supabase = getSupabaseClient();
          if (supabase) {
            const clean = termo.replace(/[^A-Z0-9]/g, '');
            let query = supabase
              .from('perfis')
              .select('id, auth_user_id, matricula, nome_completo, equipe_id, papel, situacao, email, telefone');
            if (clean && clean !== termo) {
              query = query.or(`matricula.ilike.${termo},matricula.ilike.${clean}`);
            } else {
              query = query.ilike('matricula', termo);
            }
            const { data: dbData } = await query.limit(1).maybeSingle();

            if (dbData) {
              targetUser = {
                id: dbData.id,
                authUserId: dbData.auth_user_id,
                matricula: dbData.matricula,
                nomeCompleto: dbData.nome_completo,
                equipeId: normalizeEquipeId(dbData.equipe_id),
                papel: dbData.papel,
                situacao: dbData.situacao,
                email: dbData.email,
                telefone: dbData.telefone,
              };
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar banco durante login:', err);
      } finally {
        setVerificando(false);
      }
    }

    if (!targetUser) {
      setErro(`Matrícula "${matriculaInput}" não cadastrada no sistema. O acesso é permitido somente para servidores previamente cadastrados pela Direção da Unidade.`);
      return;
    }

    if (targetUser.situacao === 'inativo') {
      setErro('Servidor com situação funcional inativa ou afastada. Contate a Direção da unidade.');
      return;
    }

    const ehDiretor = targetUser.papel === 'diretor' || (targetUser.papel as string) === 'admin';

    // Se for o DIRETOR DA UNIDADE: validação obrigatória de senha exclusiva via serviço seguro
    if (ehDiretor) {
      if (!senhaInput.trim()) {
        setErro('O Diretor da Unidade deve informar a senha de acesso (senha inicial: 123 ou 131220).');
        return;
      }

      setVerificando(true);
      try {
        const senhaValida = await verificarSenhaDiretor(targetUser.matricula, senhaInput.trim());
        if (!senhaValida) {
          setErro('Senha de acesso do Diretor incorreta. Por favor, verifique e tente novamente.');
          return;
        }
      } finally {
        setVerificando(false);
      }
    }

    // Policial Penal acessa diretamente sem senha
    onLoginSuccess(targetUser);
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
            <img
              src="./apple-touch-icon.png"
              alt="Férias PP"
              className="w-20 h-20 rounded-3xl mx-auto shadow-2xl border-2 border-gold-400/40 mb-3 object-cover"
            />
            <h1 className="font-black text-2xl tracking-tight text-white">FÉRIAS PP</h1>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Sistema de Planejamento e Controle de Férias
            </p>
            <div className="mt-3 inline-block bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Acesso Funcional da Unidade
            </div>
          </div>

          {/* Formulário de Acesso */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-navy-950 uppercase tracking-wider mb-2">
                  Informe sua Matrícula Funcional:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={matriculaInput}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    onChange={(e) => {
                      setMatriculaInput(e.target.value);
                      setErro(null);
                    }}
                    placeholder="Digite sua matrícula funcional"
                    className="w-full text-sm font-mono font-bold px-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-navy-900 rounded-2xl outline-none text-navy-950 transition shadow-inner"
                  />
                </div>
              </div>

              {/* Campo exclusivo de senha para o Diretor da Unidade */}
              {isDiretor && (
                <div className="space-y-1.5 animate-fadeIn pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-navy-950 uppercase tracking-wider">
                      Senha de Acesso do Diretor:
                    </label>
                    <span className="text-[10px] font-bold text-gold-800 bg-gold-100 px-2.5 py-0.5 rounded-full border border-gold-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-gold-600" />
                      Exclusivo Direção
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={senhaInput}
                      onChange={(e) => {
                        setSenhaInput(e.target.value);
                        setErro(null);
                      }}
                      placeholder="Digite sua senha de acesso (ex: 131220)"
                      className="w-full text-sm font-mono font-bold px-4 py-3.5 pr-12 bg-slate-50 border-2 border-gold-400 focus:border-navy-950 rounded-2xl outline-none text-navy-950 transition shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-900 transition"
                      tabIndex={-1}
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Acesso com senha exclusivo da Direção da Unidade.
                  </p>
                </div>
              )}

              {erro && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{erro}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verificando}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white bg-navy-950 hover:bg-navy-900 active:scale-[0.99] shadow-lg shadow-navy-950/20 transition flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {verificando ? (
                  <span>Verificando matrícula...</span>
                ) : isDiretor ? (
                  <>
                    <KeyRound className="w-4 h-4 text-gold-400" />
                    <span>Entrar como Diretor</span>
                  </>
                ) : (
                  <>
                    <span>Acessar o Sistema</span>
                    <ArrowRight className="w-4 h-4 text-gold-400" />
                  </>
                )}
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

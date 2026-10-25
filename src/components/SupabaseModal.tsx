import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, Key, ExternalLink, RefreshCw } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials, isSupabaseConnected, getSupabaseClient } from '../services/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onCredentialsUpdated }) => {
  const current = getSupabaseCredentials();
  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    if (!url || !anonKey) {
      setTestResult({ ok: false, msg: 'Preencha a URL do Projeto e a Chave Anon antes de testar.' });
      setTesting(false);
      return;
    }

    try {
      saveSupabaseCredentials(url, anonKey);
      const client = getSupabaseClient();
      if (!client) {
        setTestResult({ ok: false, msg: 'URL ou Chave com formato inválido.' });
        setTesting(false);
        return;
      }

      // Teste de consulta simples na tabela de equipes
      const { data, error } = await client.from('equipes').select('count').limit(1);

      if (error) {
        // Se a tabela ainda não existe, a conexão foi bem-sucedida mas o schema precisa ser executado
        if (error.code === '42P01') {
          setTestResult({
            ok: true,
            msg: 'Conexão com o Supabase ativa! Lembre-se de rodar o arquivo "supabase/schema.sql" no SQL Editor para criar as tabelas.',
          });
        } else {
          setTestResult({ ok: false, msg: `Erro de autenticação/acesso: ${error.message}` });
        }
      } else {
        setTestResult({ ok: true, msg: 'Conexão com o Supabase realizada com sucesso!' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `Falha na requisição: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveSupabaseCredentials(url, anonKey);
    onCredentialsUpdated();
    onClose();
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    onCredentialsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center text-gold-400 border border-navy-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Conexão Supabase (100% Gratuito)</h3>
              <p className="text-xs text-slate-300">Banco de Dados PostgreSQL & Autenticação Segura</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold flex items-center gap-1.5 text-blue-950 mb-1">
              <span>🛡️</span> Custo Zero & Segurança RLS:
            </p>
            O sistema funciona perfeitamente em <b>Modo Demonstração</b> com 120 policiais locais. Para conectar seu banco de dados na nuvem gratuitamente, crie um projeto no Supabase e cole a URL e a <b>Chave Pública Anon</b> abaixo. <b>Nunca use a chave service_role no navegador.</b>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Project URL (URL do Projeto Supabase)
              </label>
              <input
                type="text"
                placeholder="https://sua-unidade.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none text-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Anon Key (Chave Pública do Navegador)</span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Seguro</span>
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-600 focus:border-navy-600 outline-none text-slate-800 transition"
              />
            </div>
          </div>

          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold">{testResult.ok ? 'Sucesso' : 'Atenção'}</p>
                <p className="mt-0.5">{testResult.msg}</p>
              </div>
            </div>
          )}

          {/* Dica de como criar */}
          <div className="border-t border-slate-100 pt-3">
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-navy-600 hover:text-navy-800 flex items-center gap-1 font-medium hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Acessar painel gratuito do Supabase (supabase.com)
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-3 py-2 rounded-lg hover:bg-rose-50 transition"
          >
            Voltar ao Modo Demo Local
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testing}
              onClick={handleTest}
              className="text-xs font-semibold text-navy-800 bg-white border border-slate-300 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              Testar Conexão
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="text-xs font-bold text-white bg-navy-900 hover:bg-navy-800 px-4 py-2 rounded-xl shadow-md transition"
            >
              Salvar & Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

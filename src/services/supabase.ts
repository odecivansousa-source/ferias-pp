import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Obtenção segura de credenciais: primeiro do localStorage (configurável pelo usuário no app), depois das variáveis de ambiente
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const localUrl = localStorage.getItem('ferias_pp_supabase_url');
  const localKey = localStorage.getItem('ferias_pp_supabase_key');

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: (localUrl || envUrl || '').trim(),
    anonKey: (localKey || envKey || '').trim(),
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn('Falha ao inicializar Supabase Client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export function isSupabaseConnected(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (url) localStorage.setItem('ferias_pp_supabase_url', url.trim());
  else localStorage.removeItem('ferias_pp_supabase_url');

  if (anonKey) localStorage.setItem('ferias_pp_supabase_key', anonKey.trim());
  else localStorage.removeItem('ferias_pp_supabase_key');

  supabaseInstance = null; // força reinicialização
}

export function clearSupabaseCredentials(): void {
  localStorage.removeItem('ferias_pp_supabase_url');
  localStorage.removeItem('ferias_pp_supabase_key');
  supabaseInstance = null;
}

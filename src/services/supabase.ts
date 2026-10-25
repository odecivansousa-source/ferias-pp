import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const OFFICIAL_SUPABASE_URL = 'https://owzamemhgbmrqmwlkqcc.supabase.co';
export const OFFICIAL_SUPABASE_KEY = 'sb_publishable_9Q9g9ziWIZuhq24zRPp11Q_OgIMhkq6';

// Base oficial em nuvem compartilhada entre todos os aparelhos (PC e Celular)
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  return {
    url: OFFICIAL_SUPABASE_URL,
    anonKey: OFFICIAL_SUPABASE_KEY,
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

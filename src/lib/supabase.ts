import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

console.log('🔧 Supabase Config:', {
  url: url || '[MISSING]',
  keyPresent: !!anonKey,
  keyLength: anonKey?.length || 0
})

if (!url || !anonKey) {
  console.error('❌ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set')
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

console.log('✅ Supabase client created')

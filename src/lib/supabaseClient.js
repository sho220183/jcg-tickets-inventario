import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Aviso temprano y claro en vez de un error críptico de fetch más adelante
  console.error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Revisá tu archivo .env (copiá .env.example como base).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

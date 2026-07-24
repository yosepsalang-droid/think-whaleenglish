import { createClient } from '@supabase/supabase-js'

// Vite 환경에 맞게 암호를 불러오는 코드입니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
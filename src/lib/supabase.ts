import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Supabase URL:', SUPABASE_URL)
console.log('Supabase ANON key exists:', !!SUPABASE_ANON)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

export function createServerClient() {
  console.log('Creating server client with URL:', SUPABASE_URL)
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: false
    }
  })
}

export function createBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON)
}
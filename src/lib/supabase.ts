import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etruczhhgpomwhftoswd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cnVjemhoZ3BvbXdoZnRvc3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODk0NjcsImV4cCI6MjA2OTQ2NTQ2N30.4tphjNopN4ELm8O18QabCp4AqrhzxjsoS3ExmwkVcfM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 
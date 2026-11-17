import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local')

export const supabase = createClient(url, key)

// Returns an error message, or null when the name is free. Pass the sign-up email so retrying your own sign-up is allowed.
export async function checkUsername(name: string, email?: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('username_taken', { candidate: name, candidate_email: email })
  if (error) return error.message
  return data ? 'That username is already taken.' : null
}

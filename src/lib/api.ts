import { supabase } from './supabase'

export async function apiPost(endpoint: string, body?: unknown): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

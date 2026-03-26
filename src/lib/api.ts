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

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro na requisição' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  // Aceita: Authorization: Bearer <supabase_session_token>
  // OU: x-internal-token: <INTERNAL_API_SECRET> (para webhooks externos como Tiny)

  const internalToken = req.headers['x-internal-token']
  if (internalToken && internalToken === process.env.INTERNAL_API_SECRET) {
    return 'webhook' // autenticado como webhook interno
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized — token required' })
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized — invalid token' })
    return null
  }

  return user.id
}

import type { VercelRequest, VercelResponse } from '@vercel/node'

const APP_ID = process.env.NUVEMSHOP_APP_ID || '28487'
const CLIENT_SECRET = process.env.NUVEMSHOP_CLIENT_SECRET!
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query

  if (!code) {
    return res.status(400).send(`
      <html>
        <body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>❌ Código não encontrado</h2>
          <p>Tente autorizar novamente pelo portal Nuvemshop.</p>
        </body>
      </html>
    `)
  }

  try {
    // Troca o code pelo access_token
    const tokenRes = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APP_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code as string,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Falha ao obter token')
    }

    const { access_token, user_id } = tokenData

    // Salva no Supabase (tabela configuracoes)
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/configuracoes`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify([
          { chave: 'nuvemshop_store_id', valor: String(user_id) },
          { chave: 'nuvemshop_access_token', valor: access_token },
        ]),
      })
    }

    // Retorna página de sucesso com as credenciais
    return res.status(200).send(`
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Montserrat', sans-serif; background: #f7f5f5; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
            .card { background: white; border-radius: 16px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            h2 { color: #8e2753; margin-bottom: 8px; }
            p { color: #6b5b6e; }
            .badge { background: #f0f7f0; color: #2d7a2d; padding: 8px 16px; border-radius: 8px; font-size: 14px; margin: 8px 0; display: inline-block; }
            .code { background: #f0eef0; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; text-align: left; margin: 8px 0; }
            a { display: inline-block; margin-top: 24px; background: #8e2753; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>✅ Nuvemshop conectada!</h2>
            <p>A integração foi autorizada com sucesso.</p>
            <div class="badge">Store ID: ${user_id}</div>
            <div class="code">Access Token: ${access_token}</div>
            <p style="font-size:12px;color:#9c8fa0">Guarde esses dados ou copie abaixo e me mande no chat.</p>
            <a href="https://marijasmin-crm.vercel.app">Ir para o CRM →</a>
          </div>
        </body>
      </html>
    `)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return res.status(500).send(`
      <html>
        <body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>❌ Erro na autorização</h2>
          <p>${msg}</p>
          <p>Tente novamente ou me manda o erro no chat.</p>
        </body>
      </html>
    `)
  }
}

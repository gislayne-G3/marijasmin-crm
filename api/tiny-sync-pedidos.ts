import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth'

const TINY_TOKEN = process.env.TINY_API_TOKEN!
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function tinyGet(endpoint: string, params: Record<string, string>) {
  const body = new URLSearchParams({ token: TINY_TOKEN, formato: 'json', ...params })
  const res = await fetch(`https://api.tiny.com.br/api2/${endpoint}.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json() as { retorno: Record<string, unknown> }
  return data.retorno
}

function parseDateBR(dateStr: string): string | null {
  if (!dateStr) return null
  const [d, m, y] = dateStr.split('/')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function normalizeStatus(situacao: string): string {
  const map: Record<string, string> = {
    'aberto': 'aguardando_pagamento',
    'aprovado': 'aprovado',
    'preparando envio': 'preparando',
    'preparando': 'preparando',
    'faturado': 'faturado',
    'enviado': 'enviado',
    'entregue': 'entregue',
    'cancelado': 'cancelado',
  }
  return map[(situacao || '').toLowerCase()] || (situacao || '').toLowerCase()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { pagina_inicio = 1, pagina_fim = 10, situacao = '' } = req.body || {}

  let importados = 0
  let erros = 0
  const errosList: string[] = []

  for (let pagina = Number(pagina_inicio); pagina <= Number(pagina_fim); pagina++) {
    try {
      const params: Record<string, string> = { pagina: String(pagina) }
      if (situacao) params.situacao = situacao

      const retorno = await tinyGet('pedidos.pesquisa', params)

      if (retorno.status !== 'OK') break

      const pedidos = (retorno.pedidos as Array<{ pedido: Record<string, unknown> }>) || []
      if (!pedidos.length) break

      // Batch upsert: coleta todos da página
      const rows = pedidos.map(item => {
        const p = item.pedido
        return {
          tiny_id: parseInt(String(p.id || '0')),
          cliente_nome_tiny: String(p.nome || ''),
          data_pedido: parseDateBR(String(p.data_pedido || '')),
          valor_total: parseFloat(String(p.valor || '0')),
          status: normalizeStatus(String(p.situacao || '')),
          vendedor_nome: String(p.nome_vendedor || ''),
          codigo_rastreio: String(p.codigo_rastreamento || '') || null,
          tipo_pedido: 'venda',
          canal: 'tiny',
        }
      }).filter(r => r.tiny_id > 0)

      const { error } = await supabase
        .from('pedidos')
        .upsert(rows, { onConflict: 'tiny_id', ignoreDuplicates: false })

      if (error) {
        erros++
        errosList.push(`Página ${pagina}: ${error.message}`)
      } else {
        importados += rows.length
      }

      // Rate limit: 100 req/min → ~600ms entre páginas
      await new Promise(r => setTimeout(r, 650))

    } catch (e: unknown) {
      erros++
      errosList.push(`Página ${pagina}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return res.status(200).json({
    ok: erros === 0,
    importados,
    erros,
    errosList: errosList.slice(0, 20),
  })
}

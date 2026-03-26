import type { VercelRequest, VercelResponse } from '@vercel/node'

const STORE_ID = process.env.NUVEMSHOP_STORE_ID || '7344725'
const TOKEN    = process.env.NUVEMSHOP_ACCESS_TOKEN!
const UA       = 'Ecossistema Marijasmin (gislayne.marijasmin@gmail.com)'

async function ns(method: string, path: string, body?: object) {
  const res = await fetch(`https://api.tiendanube.com/v1/${STORE_ID}${path}`, {
    method,
    headers: {
      'Authentication': `bearer ${TOKEN}`,
      'User-Agent': UA,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Nuvemshop ${method} ${path} → ${res.status}: ${text}`)
  return text ? JSON.parse(text) : {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nuvemshop_id, descricao, preco_varejo, preco_atacado, variacoes } = req.body

  if (!nuvemshop_id) return res.status(400).json({ error: 'nuvemshop_id obrigatório' })

  const erros: string[] = []
  const atualizacoes: string[] = []

  // 1. Atualiza produto (descrição + preços)
  try {
    const body: Record<string, unknown> = {}
    if (descricao)     body.description = { pt: descricao }
    if (preco_varejo)  body.price = String(preco_varejo)
    if (preco_atacado) body.promotional_price = String(preco_atacado)

    if (Object.keys(body).length > 0) {
      await ns('PUT', `/products/${nuvemshop_id}`, body)
      atualizacoes.push('produto (descrição/preços)')
    }
  } catch (e: unknown) {
    erros.push(`produto: ${e instanceof Error ? e.message : String(e)}`)
  }

  // 2. Atualiza estoque de cada variação
  if (Array.isArray(variacoes) && variacoes.length > 0) {
    for (const v of variacoes) {
      if (!v.nuvemshop_variant_id) continue
      try {
        await ns('PUT', `/products/${nuvemshop_id}/variants/${v.nuvemshop_variant_id}`, {
          stock: v.estoque,
        })
        atualizacoes.push(`variação ${v.nuvemshop_variant_id} → estoque ${v.estoque}`)
      } catch (e: unknown) {
        erros.push(`variação ${v.nuvemshop_variant_id}: ${e instanceof Error ? e.message : String(e)}`)
      }
      // Rate limit: 40 req/min
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  res.status(200).json({
    ok: erros.length === 0,
    atualizacoes,
    erros,
  })
}

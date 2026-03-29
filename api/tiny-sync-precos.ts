import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  // 1. Busca produtos Nuvemshop que têm SKU (prefix do Tiny)
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, sku, preco_atacado, preco_promocional')
    .not('nuvemshop_id', 'is', null)
    .not('sku', 'is', null)
    .eq('ativo', true)

  if (!produtos?.length) {
    return res.status(200).json({ ok: true, atualizados: 0, msg: 'Nenhum produto com SKU encontrado' })
  }

  let atualizados = 0
  let erros = 0
  const errosList: string[] = []
  const resultados: Array<{ id: number; nome: string; preco: number; preco_promo: number | null }> = []

  for (const prod of produtos) {
    try {
      // Busca no Tiny pelo código (SKU prefix)
      const retorno = await tinyGet('produtos.pesquisa', { pesquisa: prod.sku })
      if (retorno.status !== 'OK') {
        erros++
        errosList.push(`${prod.nome}: Tiny retornou ${retorno.status}`)
        continue
      }

      const prods = (retorno.produtos as Array<{ produto: Record<string, unknown> }>) || []

      // Pega o primeiro produto que bate com o SKU prefix
      let precoAtacado = 0
      let precoPromo: number | null = null

      for (const item of prods) {
        const p = item.produto
        const codigo = String(p.codigo || '').trim()

        // Match: código começa com o SKU prefix
        if (codigo.startsWith(prod.sku)) {
          precoAtacado = Number(p.preco || 0)
          const promo = Number(p.preco_promocional || 0)
          if (promo > 0) {
            precoPromo = promo
          }
          break // Pega o primeiro match (preço é igual pra todas as variações)
        }
      }

      if (precoAtacado > 0) {
        const updateData: Record<string, unknown> = {
          preco_atacado: precoAtacado,
          updated_at: new Date().toISOString(),
        }

        // Se tem promo, salva. Se não tem, limpa.
        updateData.preco_promocional = precoPromo

        const { error } = await supabase
          .from('produtos')
          .update(updateData)
          .eq('id', prod.id)

        if (error) throw error

        atualizados++
        resultados.push({
          id: prod.id,
          nome: prod.nome,
          preco: precoAtacado,
          preco_promo: precoPromo,
        })
      }

      // Rate limit: 400ms entre chamadas
      await new Promise(r => setTimeout(r, 400))
    } catch (e: unknown) {
      erros++
      errosList.push(`${prod.nome}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return res.status(200).json({
    ok: erros === 0,
    atualizados,
    erros,
    errosList: errosList.slice(0, 20),
    resultados: resultados.slice(0, 30),
  })
}

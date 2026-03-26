import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const TINY_TOKEN = process.env.TINY_API_TOKEN!
const NUVEMSHOP_TOKEN = process.env.NUVEMSHOP_ACCESS_TOKEN!
const NUVEMSHOP_STORE_ID = '7344725'
const NUVEMSHOP_BASE = `https://api.tiendanube.com/v1/${NUVEMSHOP_STORE_ID}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  try {
    const { tiny_id } = req.body

    if (!tiny_id) {
      return res.status(400).json({ error: 'tiny_id obrigatório' })
    }

    // 1. Buscar pedido completo no Tiny API
    const tinyRes = await fetch('https://api.tiny.com.br/api2/pedido.obter.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: TINY_TOKEN,
        id: String(tiny_id),
        formato: 'json'
      }).toString()
    })
    const tinyData = await tinyRes.json()

    if (tinyData.retorno?.status !== 'OK') {
      return res.status(200).json({ error: 'Pedido não encontrado no Tiny', tiny_id })
    }

    const pedido = tinyData.retorno?.pedido
    const itens = pedido?.itens?.item || []
    if (!Array.isArray(itens) && itens) {
      // single item comes as object, not array
    }
    const itensList = Array.isArray(itens) ? itens : (itens ? [itens] : [])

    const resultados: any[] = []

    for (const item of itensList) {
      const sku = item.codigo || item.sku || ''
      const quantidade = Number(item.quantidade) || 1

      if (!sku) continue

      // 2. Encontrar variação pelo SKU
      const { data: variacoes } = await supabase
        .from('produtos_variacoes')
        .select('id, sku, estoque, produto_id, nuvemshop_variant_id')
        .ilike('sku', sku)
        .limit(1)

      if (!variacoes || variacoes.length === 0) {
        resultados.push({ sku, status: 'nao_encontrado' })
        continue
      }

      const variacao = variacoes[0]
      const novoEstoque = Math.max(0, (variacao.estoque || 0) - quantidade)

      // 3. Atualizar estoque no Supabase
      await supabase
        .from('produtos_variacoes')
        .update({ estoque: novoEstoque })
        .eq('id', variacao.id)

      // 4. Recalcular estoque total do produto
      const { data: todasVars } = await supabase
        .from('produtos_variacoes')
        .select('estoque')
        .eq('produto_id', variacao.produto_id)

      const totalEstoque = (todasVars || []).reduce((sum, v) => sum + (v.estoque || 0), 0)
      await supabase
        .from('produtos')
        .update({ estoque: totalEstoque })
        .eq('id', variacao.produto_id)

      // 5. Sincronizar com Nuvemshop se tiver variant_id
      if (variacao.nuvemshop_variant_id && NUVEMSHOP_TOKEN) {
        // Buscar produto pelo variant_id — precisamos do product_id
        const { data: produto } = await supabase
          .from('produtos')
          .select('nuvemshop_id')
          .eq('id', variacao.produto_id)
          .single()

        if (produto?.nuvemshop_id) {
          await fetch(`${NUVEMSHOP_BASE}/products/${produto.nuvemshop_id}/variants/${variacao.nuvemshop_variant_id}`, {
            method: 'PUT',
            headers: {
              'Authentication': `bearer ${NUVEMSHOP_TOKEN}`,
              'Content-Type': 'application/json',
              'User-Agent': 'MariJasmin CRM (admin@marijasmin.com.br)'
            },
            body: JSON.stringify({ stock: novoEstoque })
          })
        }
      }

      resultados.push({ sku, quantidade, estoqueAnterior: variacao.estoque, novoEstoque, status: 'atualizado' })
    }

    return res.status(200).json({ success: true, tiny_id, itens: resultados })

  } catch (error: any) {
    console.error('Erro reserva estoque:', error)
    return res.status(500).json({ error: error.message })
  }
}

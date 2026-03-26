import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const STORE_ID = process.env.NUVEMSHOP_STORE_ID || '7344725'
const TOKEN = process.env.NUVEMSHOP_ACCESS_TOKEN || '694aa8241f0ec24313353af9acfdbab13a85181b'
const UA = 'Ecossistema Marijasmin (gislayne.marijasmin@gmail.com)'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://oovdayewoaeyaolzoesq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdmRheWV3b2FleWFvbHpvZXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg4ODY1MSwiZXhwIjoyMDg5NDY0NjUxfQ.QwcadJOBZgZNT2FnHGzotgZEVRPgWrg3LzI41Xa6QzM'
)

async function nsGet(path: string) {
  const res = await fetch(`https://api.tiendanube.com/v1/${STORE_ID}${path}`, {
    headers: { 'Authentication': `bearer ${TOKEN}`, 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`Nuvemshop ${path} → ${res.status}`)
  return res.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Busca todos os produtos do Supabase com nuvemshop_id
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nuvemshop_id, nome')
    .not('nuvemshop_id', 'is', null)

  if (!produtos?.length) return res.status(200).json({ ok: true, atualizados: 0 })

  let atualizados = 0
  let erros = 0
  const errosList: string[] = []

  for (const prod of produtos) {
    try {
      // Busca variações na Nuvemshop
      const nsProduct = await nsGet(`/products/${prod.nuvemshop_id}`)
      const variants = nsProduct.variants || []

      if (!variants.length) continue

      // Atualiza estoque de cada variação pelo nuvemshop_variant_id
      for (const v of variants) {
        const variantId = String(v.id)
        const stock = v.stock ?? 0

        const { error } = await supabase
          .from('produtos_variacoes')
          .update({ estoque: stock })
          .eq('nuvemshop_variant_id', variantId)
          .eq('produto_id', prod.id)

        if (!error) atualizados++
      }

      // Recalcula estoque total do produto
      const { data: vars } = await supabase
        .from('produtos_variacoes')
        .select('estoque')
        .eq('produto_id', prod.id)

      const totalEstoque = (vars || []).reduce((s, v) => s + (v.estoque || 0), 0)
      await supabase
        .from('produtos')
        .update({ estoque: totalEstoque, updated_at: new Date().toISOString() })
        .eq('id', prod.id)

      // Rate limit Nuvemshop: ~40 req/min
      await new Promise(r => setTimeout(r, 1600))

    } catch (e: unknown) {
      erros++
      errosList.push(`${prod.nome}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return res.status(200).json({
    ok: erros === 0,
    produtos_processados: produtos.length,
    variacoes_atualizadas: atualizados,
    erros,
    errosList: errosList.slice(0, 10),
  })
}

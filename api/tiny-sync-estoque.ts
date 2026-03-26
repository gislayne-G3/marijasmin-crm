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

  // 1. Busca todas as variações do Supabase que têm SKU
  const { data: variacoes } = await supabase
    .from('produtos_variacoes')
    .select('id, sku, produto_id, estoque')
    .not('sku', 'is', null)

  if (!variacoes?.length) {
    return res.status(200).json({ ok: true, atualizados: 0, erros: 0, msg: 'Nenhuma variação com SKU encontrada' })
  }

  // 2. Busca produtos principais que têm SKU (sem variações)
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, sku, estoque')
    .not('sku', 'is', null)

  let atualizados = 0
  let erros = 0
  const errosList: string[] = []

  // Mapa: sku → variacao_id
  const skuMapVar: Record<string, { id: string; produto_id: number }> = {}
  for (const v of variacoes) {
    if (v.sku) skuMapVar[v.sku.trim()] = { id: v.id, produto_id: v.produto_id }
  }

  const skuMapProd: Record<string, number> = {}
  for (const p of (produtos || [])) {
    if (p.sku) skuMapProd[p.sku.trim()] = p.id
  }

  // Todos os SKUs para buscar no Tiny
  const allSkus = [...Object.keys(skuMapVar), ...Object.keys(skuMapProd)]

  // Tiny: busca por página filtrando variações (tipoVariacao=V e P)
  // Para evitar muitas chamadas, buscamos por prefixo de código (código pai)
  // Agrupa SKUs de variação por prefixo (ex: "2466-1" → "2466")
  const prefixos = new Set<string>()
  for (const sku of allSkus) {
    const prefix = sku.split('-')[0]
    prefixos.add(prefix)
  }

  // Mapa: sku_tiny → saldo
  const estoqueMap: Record<string, number> = {}

  for (const prefixo of prefixos) {
    try {
      const retorno = await tinyGet('produtos.pesquisa', { pesquisa: prefixo })
      if (retorno.status !== 'OK') continue

      const prods = (retorno.produtos as Array<{ produto: Record<string, unknown> }>) || []
      for (const item of prods) {
        const p = item.produto
        const codigo = String(p.codigo || '').trim()
        const saldo = Number(p.saldo || 0)
        if (allSkus.includes(codigo)) {
          estoqueMap[codigo] = saldo
        }
      }

      await new Promise(r => setTimeout(r, 400))
    } catch (e: unknown) {
      erros++
      errosList.push(`Prefixo ${prefixo}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 3. Atualiza estoque nas variações
  for (const [sku, info] of Object.entries(skuMapVar)) {
    if (estoqueMap[sku] === undefined) continue
    try {
      const { error } = await supabase
        .from('produtos_variacoes')
        .update({ estoque: estoqueMap[sku] })
        .eq('id', info.id)
      if (error) throw error
      atualizados++
    } catch (e: unknown) {
      erros++
      errosList.push(`Variação SKU ${sku}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 4. Atualiza estoque total por produto (soma das variações)
  const produtosIds = [...new Set(variacoes.map(v => v.produto_id))]
  for (const prodId of produtosIds) {
    const { data: vars } = await supabase
      .from('produtos_variacoes')
      .select('estoque')
      .eq('produto_id', prodId)

    const totalEstoque = (vars || []).reduce((sum, v) => sum + (v.estoque || 0), 0)
    await supabase
      .from('produtos')
      .update({ estoque: totalEstoque, updated_at: new Date().toISOString() })
      .eq('id', prodId)
  }

  // 5. Atualiza produtos sem variação
  for (const [sku, prodId] of Object.entries(skuMapProd)) {
    if (estoqueMap[sku] === undefined) continue
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ estoque: estoqueMap[sku], updated_at: new Date().toISOString() })
        .eq('id', prodId)
      if (error) throw error
      atualizados++
    } catch (e: unknown) {
      erros++
    }
  }

  return res.status(200).json({
    ok: erros === 0,
    atualizados,
    erros,
    errosList: errosList.slice(0, 20),
    skus_mapeados: Object.keys(estoqueMap).length,
  })
}

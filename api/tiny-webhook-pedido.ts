import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TINY_TOKEN = process.env.TINY_API_TOKEN!
const STORE_ID   = process.env.NUVEMSHOP_STORE_ID || '7344725'
const NS_TOKEN   = process.env.NUVEMSHOP_ACCESS_TOKEN!
const NS_UA      = 'Ecossistema Marijasmin (gislayne.marijasmin@gmail.com)'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function tinyPost(endpoint: string, params: Record<string, string>) {
  const body = new URLSearchParams({ token: TINY_TOKEN, formato: 'json', ...params })
  const res = await fetch(`https://api.tiny.com.br/api2/${endpoint}.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json() as { retorno: Record<string, unknown> }
  return data.retorno || {}
}

async function nsRequest(method: string, path: string, body?: object) {
  const res = await fetch(`https://api.tiendanube.com/v1/${STORE_ID}${path}`, {
    method,
    headers: {
      'Authentication': `bearer ${NS_TOKEN}`,
      'User-Agent': NS_UA,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) return null
  return res.json()
}

function parseDateBR(dateStr: string): string | null {
  if (!dateStr) return null
  const [d, m, y] = dateStr.split('/')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function normalizeStatus(s: string): string {
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
  return map[(s || '').toLowerCase()] || (s || '').toLowerCase()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Tiny envia form-encoded POST com campo "dados" contendo JSON do pedido
  // Responde sempre 200 para o Tiny não retentar

  let dadosRaw = req.body?.dados || req.query?.dados
  if (!dadosRaw) {
    return res.status(200).json({ ok: true, msg: 'Webhook recebido — sem campo dados' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pedidoBase: Record<string, any>
  try {
    pedidoBase = typeof dadosRaw === 'string' ? JSON.parse(dadosRaw) : dadosRaw
  } catch {
    return res.status(200).json({ ok: true, msg: 'JSON inválido, ignorado' })
  }

  const tinyId = parseInt(String(pedidoBase.id || '0'))
  if (!tinyId) return res.status(200).json({ ok: true, msg: 'Sem id no pedido' })

  const situacaoOriginal = String(pedidoBase.situacao || '')

  // 1. Busca pedido completo no Tiny (com itens)
  let pedido = pedidoBase
  try {
    const retorno = await tinyPost('pedido.obter', { id: String(tinyId) })
    if (retorno.status === 'OK') {
      const pedidoRetorno = (retorno as { pedido?: Record<string, unknown> }).pedido
      if (pedidoRetorno) pedido = pedidoRetorno as Record<string, any>
    }
  } catch { /* usa dados do webhook se falhar */ }

  const situacao = String(pedido.situacao || situacaoOriginal)

  // 2. Upsert pedido no Supabase
  const clienteData = (pedido.cliente || {}) as Record<string, unknown>
  await supabase.from('pedidos').upsert({
    tiny_id: tinyId,
    cliente_nome_tiny: String(clienteData.nome || pedido.nome || ''),
    data_pedido: parseDateBR(String(pedido.data_pedido || '')),
    valor_total: parseFloat(String(pedido.valor_total || pedido.valor || '0')),
    status: normalizeStatus(situacao),
    canal: 'tiny',
    tipo_pedido: 'venda',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tiny_id' })

  // 3. Extrai SKUs dos itens (apenas status que afetam estoque)
  // Aprovado/Preparando/Faturado = reserva. Cancelado = libera (Tiny já atualiza saldo)
  const statusAfetamEstoque = ['aprovado', 'preparando', 'preparando envio', 'faturado', 'enviado', 'cancelado']
  const afetaEstoque = statusAfetamEstoque.some(s => situacao.toLowerCase().includes(s))

  if (!afetaEstoque) {
    return res.status(200).json({ ok: true, pedido_id: tinyId, situacao, msg: 'Pedido salvo. Status não afeta estoque.' })
  }

  // Extrai SKUs dos itens do pedido
  const itens = (pedido.itens as Array<Record<string, unknown>>) || []
  const skuQuantMap: Record<string, number> = {}
  for (const itemWrapper of itens) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const it = ((itemWrapper as any).item || itemWrapper) as Record<string, unknown>
    const codigo = String(it.codigo || '').trim()
    if (codigo) {
      skuQuantMap[codigo] = (skuQuantMap[codigo] || 0) + Number(it.quantidade || 1)
    }
  }

  const skus = Object.keys(skuQuantMap)
  if (!skus.length) {
    return res.status(200).json({ ok: true, pedido_id: tinyId, situacao, msg: 'Sem itens com SKU' })
  }

  // 4. Busca variações no Supabase pelos SKUs
  const { data: variacoes } = await supabase
    .from('produtos_variacoes')
    .select('id, sku, produto_id, nuvemshop_variant_id')
    .in('sku', skus)

  if (!variacoes?.length) {
    return res.status(200).json({ ok: true, pedido_id: tinyId, situacao, msg: 'SKUs não encontrados no PIM', skus })
  }

  // 5. Busca estoque atualizado no Tiny para cada prefixo de produto
  // Tiny já calcula saldo com reservas deduzidas automaticamente
  const prefixos = new Set(skus.map(s => s.split('-')[0]))
  const estoqueMap: Record<string, number> = {}

  for (const prefixo of prefixos) {
    try {
      const retorno = await tinyPost('produtos.pesquisa', { pesquisa: prefixo })
      if (retorno.status !== 'OK') continue
      const prods = (retorno.produtos as Array<{ produto: Record<string, unknown> }>) || []
      for (const item of prods) {
        const p = item.produto
        const codigo = String(p.codigo || '').trim()
        if (skus.includes(codigo)) {
          estoqueMap[codigo] = Number(p.saldo || 0)
        }
      }
      await sleep(400)
    } catch { /* ignora e continua */ }
  }

  // 6. Atualiza estoque nas variações do Supabase
  const produtosAfetados = new Set<number>()

  for (const v of variacoes) {
    if (!v.sku || estoqueMap[v.sku] === undefined) continue
    await supabase.from('produtos_variacoes')
      .update({ estoque: estoqueMap[v.sku] })
      .eq('id', v.id)
    produtosAfetados.add(v.produto_id)
    await sleep(50)
  }

  // 7. Recalcula estoque total por produto (soma de variações)
  for (const prodId of produtosAfetados) {
    const { data: vars } = await supabase
      .from('produtos_variacoes')
      .select('estoque')
      .eq('produto_id', prodId)
    const total = (vars || []).reduce((s: number, v: { estoque: number }) => s + (v.estoque || 0), 0)
    await supabase.from('produtos')
      .update({ estoque: total, updated_at: new Date().toISOString() })
      .eq('id', prodId)
  }

  // 8. Sincroniza estoque atualizado → Nuvemshop (por nuvemshop_variant_id)
  const { data: produtosNS } = await supabase
    .from('produtos')
    .select('id, nuvemshop_id')
    .in('id', [...produtosAfetados])
    .not('nuvemshop_id', 'is', null)

  for (const prod of (produtosNS || [])) {
    const { data: varsNS } = await supabase
      .from('produtos_variacoes')
      .select('nuvemshop_variant_id, estoque')
      .eq('produto_id', prod.id)
      .not('nuvemshop_variant_id', 'is', null)

    for (const v of (varsNS || [])) {
      try {
        await nsRequest('PUT', `/products/${prod.nuvemshop_id}/variants/${v.nuvemshop_variant_id}`, {
          stock: v.estoque,
        })
        await sleep(400)
      } catch { /* continua para próxima variação */ }
    }
  }

  return res.status(200).json({
    ok: true,
    pedido_id: tinyId,
    situacao,
    skus_do_pedido: skuQuantMap,
    estoque_tiny_pos_venda: estoqueMap,
    variacoes_atualizadas: variacoes.length,
    produtos_afetados: [...produtosAfetados],
    sincronizado_nuvemshop: (produtosNS || []).length > 0,
  })
}

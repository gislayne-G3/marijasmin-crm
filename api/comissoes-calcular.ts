import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { mes_ref } = req.body || {}

  if (!mes_ref) {
    return res.status(400).json({ error: 'mes_ref obrigatório (ex: 2026-04)' })
  }

  try {
    // Buscar vendedoras humanas
    const { data: vendedoras } = await supabase
      .from('vendedoras')
      .select('id, nome, meta_percentual_comissao')
      .eq('tipo', 'vendedora_humana')
      .eq('ativa', true)

    if (!vendedoras || vendedoras.length === 0) {
      return res.status(400).json({ error: 'Nenhuma vendedora encontrada' })
    }

    // Buscar pedidos do mês (incluindo frete)
    const [ano, mes] = mes_ref.split('-').map(Number)
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const dataFim = `${ano}-${String(mes + 1).padStart(2, '0')}-01`

    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('vendedora_id, valor_total, tipo_envio')
      .gte('data_pedido', dataInicio)
      .lt('data_pedido', mes === 12 ? `${ano + 1}-01-01` : dataFim)
      .in('vendedora_id', vendedoras.map(v => v.id))

    // Buscar itens de frete dos pedidos do mês
    // Frete é identificado no pedido — usamos campo tipo_envio
    // Como não temos campo de frete separado, estimamos com base no tipo_envio
    // ou buscamos itens de pedido com nome contendo 'frete'
    const pedidoIds = (pedidos || []).map(p => {
      // Precisamos dos IDs, mas a query acima não retorna id
      return null
    }).filter(Boolean)

    // Recalcular: buscar pedidos com id para cruzar com pedido_itens
    const { data: pedidosCompletos } = await supabase
      .from('pedidos')
      .select('id, vendedora_id, valor_total')
      .gte('data_pedido', dataInicio)
      .lt('data_pedido', mes === 12 ? `${ano + 1}-01-01` : dataFim)
      .in('vendedora_id', vendedoras.map(v => v.id))

    // Buscar itens que são frete
    const pedidoIdList = (pedidosCompletos || []).map(p => p.id)

    let fretePorPedido: Record<number, number> = {}

    if (pedidoIdList.length > 0) {
      // Buscar em lotes de 500 para evitar limites
      for (let i = 0; i < pedidoIdList.length; i += 500) {
        const batch = pedidoIdList.slice(i, i + 500)
        const { data: itensFrete } = await supabase
          .from('pedido_itens')
          .select('pedido_id, valor_total')
          .in('pedido_id', batch)
          .or('descricao.ilike.%frete%,descricao.ilike.%envio%,descricao.ilike.%sedex%,descricao.ilike.%pac%,descricao.ilike.%correios%,descricao.ilike.%transporta%')

        for (const item of itensFrete || []) {
          fretePorPedido[item.pedido_id] = (fretePorPedido[item.pedido_id] || 0) + Number(item.valor_total || 0)
        }
      }
    }

    // Calcular comissão por vendedora
    const comissoes: Array<{
      vendedora_id: number
      vendedora_nome: string
      total_vendas_bruto: number
      total_frete: number
      total_vendas_liquido: number
      percentual_comissao: number
      valor_comissao: number
      qtd_pedidos: number
      ticket_medio: number
    }> = []

    for (const v of vendedoras) {
      const pedidosVendedora = (pedidosCompletos || []).filter(p => p.vendedora_id === v.id)
      const totalBruto = pedidosVendedora.reduce((s, p) => s + (Number(p.valor_total) || 0), 0)
      const totalFrete = pedidosVendedora.reduce((s, p) => s + (fretePorPedido[p.id] || 0), 0)
      const totalLiquido = totalBruto - totalFrete
      const percentual = Number(v.meta_percentual_comissao) || 3
      const valorComissao = totalLiquido * (percentual / 100)

      comissoes.push({
        vendedora_id: v.id,
        vendedora_nome: v.nome,
        total_vendas_bruto: Math.round(totalBruto * 100) / 100,
        total_frete: Math.round(totalFrete * 100) / 100,
        total_vendas_liquido: Math.round(totalLiquido * 100) / 100,
        percentual_comissao: percentual,
        valor_comissao: Math.round(valorComissao * 100) / 100,
        qtd_pedidos: pedidosVendedora.length,
        ticket_medio: pedidosVendedora.length > 0
          ? Math.round((totalBruto / pedidosVendedora.length) * 100) / 100
          : 0,
      })
    }

    // Upsert na tabela comissoes (atualiza se já existir para o mês)
    for (const c of comissoes) {
      const { data: existing } = await supabase
        .from('comissoes')
        .select('id')
        .eq('mes_ref', mes_ref)
        .eq('vendedora_id', c.vendedora_id)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('comissoes')
          .update({
            vendedora_nome: c.vendedora_nome,
            total_vendas_bruto: c.total_vendas_bruto,
            total_frete: c.total_frete,
            total_vendas_liquido: c.total_vendas_liquido,
            percentual_comissao: c.percentual_comissao,
            valor_comissao: c.valor_comissao,
            total_vendas: c.total_vendas_bruto,
            percentual: c.percentual_comissao,
            status: 'calculado',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('comissoes')
          .insert({
            vendedora_id: c.vendedora_id,
            vendedora_nome: c.vendedora_nome,
            mes_ref,
            total_vendas: c.total_vendas_bruto,
            total_vendas_bruto: c.total_vendas_bruto,
            total_frete: c.total_frete,
            total_vendas_liquido: c.total_vendas_liquido,
            percentual: c.percentual_comissao,
            percentual_comissao: c.percentual_comissao,
            valor_comissao: c.valor_comissao,
            status: 'calculado',
          })
      }
    }

    // Atualizar realizado nas metas_vendedoras (se existir meta ativa para o mês)
    const { data: metaAtiva } = await supabase
      .from('metas_mensais')
      .select('id')
      .eq('mes_ref', mes_ref)
      .eq('status', 'ativa')
      .maybeSingle()

    if (metaAtiva) {
      for (const c of comissoes) {
        const { data: metaV } = await supabase
          .from('metas_vendedoras')
          .select('id, meta_mensal')
          .eq('meta_mensal_id', metaAtiva.id)
          .eq('vendedora_id', c.vendedora_id)
          .maybeSingle()

        if (metaV) {
          const percentualMensal = metaV.meta_mensal > 0
            ? Math.round((c.total_vendas_bruto / Number(metaV.meta_mensal)) * 10000) / 100
            : 0

          await supabase
            .from('metas_vendedoras')
            .update({
              realizado_mensal: c.total_vendas_bruto,
              percentual_mensal: percentualMensal,
              comissao_calculada: c.valor_comissao,
              updated_at: new Date().toISOString(),
            })
            .eq('id', metaV.id)
        }
      }
    }

    // Totais
    const totalGeral = comissoes.reduce((s, c) => s + c.total_vendas_bruto, 0)
    const totalComissoes = comissoes.reduce((s, c) => s + c.valor_comissao, 0)

    return res.status(200).json({
      ok: true,
      mes_ref,
      total_vendas_equipe: Math.round(totalGeral * 100) / 100,
      total_comissoes: Math.round(totalComissoes * 100) / 100,
      comissoes,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao calcular comissões'
    return res.status(500).json({ error: msg })
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_auth.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { action, ...body } = req.body || {}

  if (!action) {
    return res.status(400).json({ error: 'action obrigatório (metas-distribuir|metas-aprovar|comissoes-calcular|agente-fiscal)' })
  }

  try {
    switch (action) {
      case 'metas-distribuir':
        return await metasDistribuir(body, res)
      case 'metas-aprovar':
        return await metasAprovar(body, userId, res)
      case 'comissoes-calcular':
        return await comissoesCalcular(body, res)
      case 'agente-fiscal':
        return await agenteFiscal(body, res)
      default:
        return res.status(400).json({ error: `action '${action}' não reconhecida` })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return res.status(500).json({ error: msg })
  }
}

/* ─── METAS DISTRIBUIR ─── */
async function metasDistribuir(body: Record<string, unknown>, res: VercelResponse) {
  const { meta_geral, meta_minima, mes_ref } = body

  if (!meta_geral || !meta_minima || !mes_ref) {
    return res.status(400).json({ error: 'meta_geral, meta_minima e mes_ref são obrigatórios' })
  }

  const metaVendedoras = Number(meta_geral) * 0.40
  const metaSite = Number(meta_geral) * 0.30
  const metaLojaFisica = Number(meta_geral) * 0.30

  const { data: vendedoras } = await supabase
    .from('vendedoras')
    .select('id, nome, meta_percentual_comissao')
    .eq('tipo', 'vendedora_humana')
    .eq('ativa', true)

  if (!vendedoras || vendedoras.length === 0) {
    return res.status(400).json({ error: 'Nenhuma vendedora humana ativa encontrada' })
  }

  const tresMesesAtras = new Date()
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3)
  const dataInicio = tresMesesAtras.toISOString().slice(0, 10)

  const { data: historico } = await supabase
    .from('pedidos')
    .select('vendedora_id, valor_total')
    .gte('data_pedido', dataInicio)
    .in('vendedora_id', vendedoras.map(v => v.id))

  const vendaPorVendedora: Record<number, number> = {}
  let totalEquipe = 0
  for (const v of vendedoras) vendaPorVendedora[v.id] = 0
  for (const p of historico || []) {
    if (p.vendedora_id && vendaPorVendedora[p.vendedora_id] !== undefined) {
      const val = Number(p.valor_total) || 0
      vendaPorVendedora[p.vendedora_id] += val
      totalEquipe += val
    }
  }

  const [ano, mesNum] = (mes_ref as string).split('-').map(Number)
  const diasNoMes = new Date(ano, mesNum, 0).getDate()
  let diasUteis = 0
  for (let d = 1; d <= diasNoMes; d++) {
    const dia = new Date(ano, mesNum - 1, d).getDay()
    if (dia !== 0) diasUteis++
  }
  const semanasUteis = Math.ceil(diasUteis / 6)

  const metas: Array<{
    vendedora_id: number; vendedora_nome: string; meta_mensal: number
    meta_semanal: number; meta_diaria: number; ticket_medio_meta: number
    historico_3m: number; percentual_equipe: number
  }> = []

  for (const v of vendedoras) {
    let metaIndividual = totalEquipe > 0
      ? metaVendedoras * (vendaPorVendedora[v.id] / totalEquipe)
      : metaVendedoras / vendedoras.length

    const metaMinIndividual = metaVendedoras * 0.05
    if (metaIndividual < metaMinIndividual) metaIndividual = metaMinIndividual
    metaIndividual = Math.round(metaIndividual / 100) * 100

    const pedidosVendedora = (historico || []).filter(p => p.vendedora_id === v.id).length
    const ticketHistorico = pedidosVendedora > 0 ? vendaPorVendedora[v.id] / pedidosVendedora : 250
    const pedidosEsperados = Math.ceil(metaIndividual / ticketHistorico)

    metas.push({
      vendedora_id: v.id,
      vendedora_nome: v.nome,
      meta_mensal: metaIndividual,
      meta_semanal: Math.round(metaIndividual / semanasUteis),
      meta_diaria: Math.round(metaIndividual / diasUteis),
      ticket_medio_meta: pedidosEsperados > 0 ? Math.round(metaIndividual / pedidosEsperados) : Math.round(ticketHistorico),
      historico_3m: Math.round(vendaPorVendedora[v.id]),
      percentual_equipe: totalEquipe > 0 ? Math.round((vendaPorVendedora[v.id] / totalEquipe) * 100) : Math.round(100 / vendedoras.length),
    })
  }

  const { data: metaMensal, error: errMeta } = await supabase
    .from('metas_mensais')
    .insert({ mes_ref, meta_geral: Number(meta_geral), meta_minima: Number(meta_minima), meta_vendedoras: metaVendedoras, meta_site: metaSite, meta_loja_fisica: metaLojaFisica, status: 'rascunho' })
    .select('id').single()
  if (errMeta) throw errMeta

  const { error: errMetas } = await supabase
    .from('metas_vendedoras')
    .insert(metas.map(m => ({ meta_mensal_id: metaMensal.id, vendedora_id: m.vendedora_id, vendedora_nome: m.vendedora_nome, mes_ref, meta_mensal: m.meta_mensal, meta_semanal: m.meta_semanal, meta_diaria: m.meta_diaria, ticket_medio_meta: m.ticket_medio_meta, status_aprovacao: 'pendente' })))
  if (errMetas) throw errMetas

  return res.status(200).json({
    ok: true, meta_mensal_id: metaMensal.id,
    distribuicao: { meta_geral: Number(meta_geral), meta_minima: Number(meta_minima), meta_vendedoras: metaVendedoras, meta_site: metaSite, meta_loja_fisica: metaLojaFisica, dias_uteis: diasUteis, semanas_uteis: semanasUteis },
    metas_individuais: metas,
  })
}

/* ─── METAS APROVAR ─── */
async function metasAprovar(body: Record<string, unknown>, userId: string, res: VercelResponse) {
  const { meta_mensal_id, ajustes } = body

  if (!meta_mensal_id) return res.status(400).json({ error: 'meta_mensal_id obrigatório' })

  const { data: meta, error: errMeta } = await supabase
    .from('metas_mensais').select('*').eq('id', meta_mensal_id).single()
  if (errMeta || !meta) return res.status(404).json({ error: 'Meta mensal não encontrada' })
  if (meta.status === 'ativa') return res.status(400).json({ error: 'Meta já está ativa.' })

  if (ajustes && Array.isArray(ajustes)) {
    for (const aj of ajustes as Array<{ vendedora_id: number; meta_mensal: number }>) {
      if (!aj.vendedora_id || !aj.meta_mensal) continue
      const metaMensal = Number(aj.meta_mensal)
      const [ano, mesNum] = meta.mes_ref.split('-').map(Number)
      const diasNoMes = new Date(ano, mesNum, 0).getDate()
      let diasUteis = 0
      for (let d = 1; d <= diasNoMes; d++) { if (new Date(ano, mesNum - 1, d).getDay() !== 0) diasUteis++ }
      const semanasUteis = Math.ceil(diasUteis / 6)
      await supabase.from('metas_vendedoras').update({ meta_mensal: metaMensal, meta_semanal: Math.round(metaMensal / semanasUteis), meta_diaria: Math.round(metaMensal / diasUteis), status_aprovacao: 'ajustada', updated_at: new Date().toISOString() }).eq('meta_mensal_id', meta_mensal_id).eq('vendedora_id', aj.vendedora_id)
    }
  }

  await supabase.from('metas_vendedoras').update({ status_aprovacao: 'aprovada', updated_at: new Date().toISOString() }).eq('meta_mensal_id', meta_mensal_id).eq('status_aprovacao', 'pendente')
  await supabase.from('metas_mensais').update({ status: 'rascunho' }).eq('mes_ref', meta.mes_ref).neq('id', meta_mensal_id)
  await supabase.from('metas_mensais').update({ status: 'ativa', aprovada_por: userId, aprovada_em: new Date().toISOString() }).eq('id', meta_mensal_id)

  const { data: metasAprovadas } = await supabase.from('metas_vendedoras').select('*').eq('meta_mensal_id', meta_mensal_id).order('vendedora_nome')

  return res.status(200).json({ ok: true, message: 'Metas aprovadas e publicadas com sucesso!', meta_mensal: { ...meta, status: 'ativa' }, metas_vendedoras: metasAprovadas })
}

/* ─── COMISSÕES CALCULAR ─── */
async function comissoesCalcular(body: Record<string, unknown>, res: VercelResponse) {
  const { mes_ref } = body
  if (!mes_ref) return res.status(400).json({ error: 'mes_ref obrigatório (ex: 2026-04)' })

  const { data: vendedoras } = await supabase.from('vendedoras').select('id, nome, meta_percentual_comissao').eq('tipo', 'vendedora_humana').eq('ativa', true)
  if (!vendedoras || vendedoras.length === 0) return res.status(400).json({ error: 'Nenhuma vendedora encontrada' })

  const [ano, mes] = (mes_ref as string).split('-').map(Number)
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFim = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  const { data: pedidosCompletos } = await supabase.from('pedidos').select('id, vendedora_id, valor_total').gte('data_pedido', dataInicio).lt('data_pedido', dataFim).in('vendedora_id', vendedoras.map(v => v.id))

  const pedidoIdList = (pedidosCompletos || []).map(p => p.id)
  const fretePorPedido: Record<number, number> = {}

  if (pedidoIdList.length > 0) {
    for (let i = 0; i < pedidoIdList.length; i += 500) {
      const batch = pedidoIdList.slice(i, i + 500)
      const { data: itensFrete } = await supabase.from('pedido_itens').select('pedido_id, valor_total').in('pedido_id', batch).or('descricao.ilike.%frete%,descricao.ilike.%envio%,descricao.ilike.%sedex%,descricao.ilike.%pac%,descricao.ilike.%correios%,descricao.ilike.%transporta%')
      for (const item of itensFrete || []) { fretePorPedido[item.pedido_id] = (fretePorPedido[item.pedido_id] || 0) + Number(item.valor_total || 0) }
    }
  }

  const comissoes: Array<{ vendedora_id: number; vendedora_nome: string; total_vendas_bruto: number; total_frete: number; total_vendas_liquido: number; percentual_comissao: number; valor_comissao: number; qtd_pedidos: number; ticket_medio: number }> = []

  for (const v of vendedoras) {
    const pv = (pedidosCompletos || []).filter(p => p.vendedora_id === v.id)
    const totalBruto = pv.reduce((s, p) => s + (Number(p.valor_total) || 0), 0)
    const totalFrete = pv.reduce((s, p) => s + (fretePorPedido[p.id] || 0), 0)
    const totalLiquido = totalBruto - totalFrete
    const pct = Number(v.meta_percentual_comissao) || 3
    comissoes.push({ vendedora_id: v.id, vendedora_nome: v.nome, total_vendas_bruto: Math.round(totalBruto * 100) / 100, total_frete: Math.round(totalFrete * 100) / 100, total_vendas_liquido: Math.round(totalLiquido * 100) / 100, percentual_comissao: pct, valor_comissao: Math.round(totalLiquido * (pct / 100) * 100) / 100, qtd_pedidos: pv.length, ticket_medio: pv.length > 0 ? Math.round((totalBruto / pv.length) * 100) / 100 : 0 })
  }

  for (const c of comissoes) {
    const { data: existing } = await supabase.from('comissoes').select('id').eq('mes_ref', mes_ref as string).eq('vendedora_id', c.vendedora_id).maybeSingle()
    if (existing) {
      await supabase.from('comissoes').update({ vendedora_nome: c.vendedora_nome, total_vendas_bruto: c.total_vendas_bruto, total_frete: c.total_frete, total_vendas_liquido: c.total_vendas_liquido, percentual_comissao: c.percentual_comissao, valor_comissao: c.valor_comissao, total_vendas: c.total_vendas_bruto, percentual: c.percentual_comissao, status: 'calculado', updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('comissoes').insert({ vendedora_id: c.vendedora_id, vendedora_nome: c.vendedora_nome, mes_ref, total_vendas: c.total_vendas_bruto, total_vendas_bruto: c.total_vendas_bruto, total_frete: c.total_frete, total_vendas_liquido: c.total_vendas_liquido, percentual: c.percentual_comissao, percentual_comissao: c.percentual_comissao, valor_comissao: c.valor_comissao, status: 'calculado' })
    }
  }

  const { data: metaAtiva } = await supabase.from('metas_mensais').select('id').eq('mes_ref', mes_ref as string).eq('status', 'ativa').maybeSingle()
  if (metaAtiva) {
    for (const c of comissoes) {
      const { data: metaV } = await supabase.from('metas_vendedoras').select('id, meta_mensal').eq('meta_mensal_id', metaAtiva.id).eq('vendedora_id', c.vendedora_id).maybeSingle()
      if (metaV) {
        await supabase.from('metas_vendedoras').update({ realizado_mensal: c.total_vendas_bruto, percentual_mensal: metaV.meta_mensal > 0 ? Math.round((c.total_vendas_bruto / Number(metaV.meta_mensal)) * 10000) / 100 : 0, comissao_calculada: c.valor_comissao, updated_at: new Date().toISOString() }).eq('id', metaV.id)
      }
    }
  }

  return res.status(200).json({ ok: true, mes_ref, total_vendas_equipe: Math.round(comissoes.reduce((s, c) => s + c.total_vendas_bruto, 0) * 100) / 100, total_comissoes: Math.round(comissoes.reduce((s, c) => s + c.valor_comissao, 0) * 100) / 100, comissoes })
}

/* ─── AGENTE FISCAL ─── */
async function agenteFiscal(body: Record<string, unknown>, res: VercelResponse) {
  const { pergunta, mes_ref, contexto } = body
  if (!pergunta) return res.status(400).json({ error: 'pergunta é obrigatória' })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const systemPrompt = `Você é o Agente Fiscal Comercial da Marijasmin, uma marca de moda feminina cristã e modesta do Ceará.

Seu papel: analisar dados comerciais e dar respostas estratégicas para a Diretora Comercial.

REGRAS:
- Sempre responda em português brasileiro
- Seja direto e prático — a diretora é ocupada
- Sempre inclua: 1) Análise do cenário 2) 3 ações concretas 3) Prazo sugerido para cada ação
- Use emojis moderadamente para destacar pontos
- Considere o contexto cristão e acolhedor da marca
- Foque em resultados mensuráveis
- Quando falar de vendedoras, seja respeitoso e construtivo
- Nunca sugira demissões — sugira treinamento, mentoria, redistribuição`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: `MÊS DE REFERÊNCIA: ${mes_ref || 'atual'}\n\nDADOS ATUAIS:\n${JSON.stringify(contexto, null, 2)}\n\nPERGUNTA DA DIRETORA:\n${pergunta}` }],
  })

  const resposta = response.content.filter(block => block.type === 'text').map(block => (block as { type: 'text'; text: string }).text).join('\n')
  return res.status(200).json({ ok: true, resposta })
}

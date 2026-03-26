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

  const { meta_geral, meta_minima, mes_ref } = req.body || {}

  if (!meta_geral || !meta_minima || !mes_ref) {
    return res.status(400).json({ error: 'meta_geral, meta_minima e mes_ref são obrigatórios' })
  }

  try {
    // Distribuição fixa: 40% vendedoras, 30% site, 30% loja física
    const metaVendedoras = Number(meta_geral) * 0.40
    const metaSite = Number(meta_geral) * 0.30
    const metaLojaFisica = Number(meta_geral) * 0.30

    // Buscar vendedoras humanas ativas
    const { data: vendedoras } = await supabase
      .from('vendedoras')
      .select('id, nome, meta_percentual_comissao')
      .eq('tipo', 'vendedora_humana')
      .eq('ativa', true)

    if (!vendedoras || vendedoras.length === 0) {
      return res.status(400).json({ error: 'Nenhuma vendedora humana ativa encontrada' })
    }

    // Buscar histórico de vendas dos últimos 3 meses por vendedora
    const tresMesesAtras = new Date()
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3)
    const dataInicio = tresMesesAtras.toISOString().slice(0, 10)

    const { data: historico } = await supabase
      .from('pedidos')
      .select('vendedora_id, valor_total')
      .gte('data_pedido', dataInicio)
      .in('vendedora_id', vendedoras.map(v => v.id))

    // Calcular total por vendedora nos últimos 3 meses
    const vendaPorVendedora: Record<number, number> = {}
    let totalEquipe = 0

    for (const v of vendedoras) {
      vendaPorVendedora[v.id] = 0
    }

    for (const p of historico || []) {
      if (p.vendedora_id && vendaPorVendedora[p.vendedora_id] !== undefined) {
        const val = Number(p.valor_total) || 0
        vendaPorVendedora[p.vendedora_id] += val
        totalEquipe += val
      }
    }

    // Distribuir meta proporcional ao histórico (ou igualmente se sem histórico)
    const metas: Array<{
      vendedora_id: number
      vendedora_nome: string
      meta_mensal: number
      meta_semanal: number
      meta_diaria: number
      ticket_medio_meta: number
      historico_3m: number
      percentual_equipe: number
    }> = []

    // Calcular dias/semanas úteis do mês
    const [ano, mesNum] = mes_ref.split('-').map(Number)
    const diasNoMes = new Date(ano, mesNum, 0).getDate()
    let diasUteis = 0
    for (let d = 1; d <= diasNoMes; d++) {
      const dia = new Date(ano, mesNum - 1, d).getDay()
      if (dia !== 0) diasUteis++ // exclui domingo
    }
    const semanasUteis = Math.ceil(diasUteis / 6) // seg-sáb

    for (const v of vendedoras) {
      let metaIndividual: number

      if (totalEquipe > 0) {
        // Proporcional ao histórico de performance
        const pesoHistorico = vendaPorVendedora[v.id] / totalEquipe
        metaIndividual = metaVendedoras * pesoHistorico
      } else {
        // Sem histórico: divide igualmente
        metaIndividual = metaVendedoras / vendedoras.length
      }

      // Garantir meta mínima razoável (pelo menos 5% do total de vendedoras)
      const metaMinIndividual = metaVendedoras * 0.05
      if (metaIndividual < metaMinIndividual) {
        metaIndividual = metaMinIndividual
      }

      // Arredondar para centenas
      metaIndividual = Math.round(metaIndividual / 100) * 100

      const metaSemanal = Math.round(metaIndividual / semanasUteis)
      const metaDiaria = Math.round(metaIndividual / diasUteis)

      // Ticket médio meta: baseado no histórico ou R$250 default
      const pedidosVendedora = (historico || []).filter(p => p.vendedora_id === v.id).length
      const ticketHistorico = pedidosVendedora > 0
        ? vendaPorVendedora[v.id] / pedidosVendedora
        : 250

      const pedidosEsperados = Math.ceil(metaIndividual / ticketHistorico)
      const ticketMedioMeta = pedidosEsperados > 0
        ? Math.round(metaIndividual / pedidosEsperados)
        : Math.round(ticketHistorico)

      metas.push({
        vendedora_id: v.id,
        vendedora_nome: v.nome,
        meta_mensal: metaIndividual,
        meta_semanal: metaSemanal,
        meta_diaria: metaDiaria,
        ticket_medio_meta: ticketMedioMeta,
        historico_3m: Math.round(vendaPorVendedora[v.id]),
        percentual_equipe: totalEquipe > 0
          ? Math.round((vendaPorVendedora[v.id] / totalEquipe) * 100)
          : Math.round(100 / vendedoras.length),
      })
    }

    // Salvar meta mensal geral
    const { data: metaMensal, error: errMeta } = await supabase
      .from('metas_mensais')
      .insert({
        mes_ref,
        meta_geral: Number(meta_geral),
        meta_minima: Number(meta_minima),
        meta_vendedoras: metaVendedoras,
        meta_site: metaSite,
        meta_loja_fisica: metaLojaFisica,
        status: 'rascunho',
      })
      .select('id')
      .single()

    if (errMeta) throw errMeta

    // Salvar metas individuais (pendente de aprovação)
    const metasParaInserir = metas.map(m => ({
      meta_mensal_id: metaMensal.id,
      vendedora_id: m.vendedora_id,
      vendedora_nome: m.vendedora_nome,
      mes_ref,
      meta_mensal: m.meta_mensal,
      meta_semanal: m.meta_semanal,
      meta_diaria: m.meta_diaria,
      ticket_medio_meta: m.ticket_medio_meta,
      status_aprovacao: 'pendente',
    }))

    const { error: errMetas } = await supabase
      .from('metas_vendedoras')
      .insert(metasParaInserir)

    if (errMetas) throw errMetas

    return res.status(200).json({
      ok: true,
      meta_mensal_id: metaMensal.id,
      distribuicao: {
        meta_geral: Number(meta_geral),
        meta_minima: Number(meta_minima),
        meta_vendedoras: metaVendedoras,
        meta_site: metaSite,
        meta_loja_fisica: metaLojaFisica,
        dias_uteis: diasUteis,
        semanas_uteis: semanasUteis,
      },
      metas_individuais: metas,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao distribuir metas'
    return res.status(500).json({ error: msg })
  }
}

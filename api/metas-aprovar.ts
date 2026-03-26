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

  const { meta_mensal_id, ajustes } = req.body || {}

  if (!meta_mensal_id) {
    return res.status(400).json({ error: 'meta_mensal_id obrigatório' })
  }

  try {
    // Verificar se a meta existe e está em rascunho
    const { data: meta, error: errMeta } = await supabase
      .from('metas_mensais')
      .select('*')
      .eq('id', meta_mensal_id)
      .single()

    if (errMeta || !meta) {
      return res.status(404).json({ error: 'Meta mensal não encontrada' })
    }

    if (meta.status === 'ativa') {
      return res.status(400).json({ error: 'Meta já está ativa. Não pode ser alterada.' })
    }

    // Aplicar ajustes individuais (se houver)
    // ajustes: [{ vendedora_id: 1, meta_mensal: 35000 }, ...]
    if (ajustes && Array.isArray(ajustes)) {
      for (const aj of ajustes) {
        if (!aj.vendedora_id || !aj.meta_mensal) continue

        const metaMensal = Number(aj.meta_mensal)

        // Recalcular semanal e diária
        const [ano, mesNum] = meta.mes_ref.split('-').map(Number)
        const diasNoMes = new Date(ano, mesNum, 0).getDate()
        let diasUteis = 0
        for (let d = 1; d <= diasNoMes; d++) {
          const dia = new Date(ano, mesNum - 1, d).getDay()
          if (dia !== 0) diasUteis++
        }
        const semanasUteis = Math.ceil(diasUteis / 6)

        await supabase
          .from('metas_vendedoras')
          .update({
            meta_mensal: metaMensal,
            meta_semanal: Math.round(metaMensal / semanasUteis),
            meta_diaria: Math.round(metaMensal / diasUteis),
            status_aprovacao: 'ajustada',
            updated_at: new Date().toISOString(),
          })
          .eq('meta_mensal_id', meta_mensal_id)
          .eq('vendedora_id', aj.vendedora_id)
      }
    }

    // Aprovar todas as metas pendentes
    await supabase
      .from('metas_vendedoras')
      .update({
        status_aprovacao: 'aprovada',
        updated_at: new Date().toISOString(),
      })
      .eq('meta_mensal_id', meta_mensal_id)
      .eq('status_aprovacao', 'pendente')

    // Atualizar status da meta geral para ativa
    // Desativar metas anteriores do mesmo mês
    await supabase
      .from('metas_mensais')
      .update({ status: 'rascunho' })
      .eq('mes_ref', meta.mes_ref)
      .neq('id', meta_mensal_id)

    await supabase
      .from('metas_mensais')
      .update({
        status: 'ativa',
        aprovada_por: userId,
        aprovada_em: new Date().toISOString(),
      })
      .eq('id', meta_mensal_id)

    // Buscar metas aprovadas para retornar
    const { data: metasAprovadas } = await supabase
      .from('metas_vendedoras')
      .select('*')
      .eq('meta_mensal_id', meta_mensal_id)
      .order('vendedora_nome')

    return res.status(200).json({
      ok: true,
      message: 'Metas aprovadas e publicadas com sucesso!',
      meta_mensal: { ...meta, status: 'ativa' },
      metas_vendedoras: metasAprovadas,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao aprovar metas'
    return res.status(500).json({ error: msg })
  }
}

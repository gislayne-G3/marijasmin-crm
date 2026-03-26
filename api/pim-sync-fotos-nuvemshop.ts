import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const STORE_ID = process.env.NUVEMSHOP_STORE_ID || '7344725'
const TOKEN    = process.env.NUVEMSHOP_ACCESS_TOKEN!
const UA       = 'Ecossistema Marijasmin (gislayne.marijasmin@gmail.com)'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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
  if (!res.ok) throw new Error(`NS ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : {}
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { produto_id } = req.body
  if (!produto_id) return res.status(400).json({ error: 'produto_id obrigatório' })

  // 1. Busca produto no Supabase
  const { data: produto } = await supabase
    .from('produtos')
    .select('id, nuvemshop_id, nome')
    .eq('id', produto_id)
    .single()

  if (!produto?.nuvemshop_id) {
    return res.status(400).json({ error: 'Produto sem nuvemshop_id' })
  }

  const nsId = produto.nuvemshop_id

  // 2. Busca cores do produto no Supabase
  const { data: cores } = await supabase
    .from('produtos_cores')
    .select('*')
    .eq('produto_id', produto_id)

  if (!cores?.length) {
    return res.status(200).json({ ok: true, msg: 'Nenhuma cor cadastrada no PIM ainda.' })
  }

  // 3. Busca variações do produto no Supabase (para pegar nuvemshop_variant_id por cor)
  const { data: variacoes } = await supabase
    .from('produtos_variacoes')
    .select('cor, nuvemshop_variant_id')
    .eq('produto_id', produto_id)
    .not('nuvemshop_variant_id', 'is', null)

  // Mapa: cor → [nuvemshop_variant_id, ...]
  const corVariantMap: Record<string, string[]> = {}
  for (const v of (variacoes || [])) {
    if (!corVariantMap[v.cor]) corVariantMap[v.cor] = []
    if (v.nuvemshop_variant_id) corVariantMap[v.cor].push(v.nuvemshop_variant_id)
  }

  // 4. Busca imagens existentes na Nuvemshop para este produto
  const nsProduct = await ns('GET', `/products/${nsId}`)
  const imagensExistentes: Array<{ id: number; src: string; alt: Record<string, string> }> = nsProduct.images || []

  // Mapa: cor → image_id (imagens já existentes na Nuvemshop com alt = cor)
  const corImageNSMap: Record<string, number> = {}
  for (const img of imagensExistentes) {
    const altPt = img.alt?.pt || img.alt?.es || ''
    if (altPt) corImageNSMap[altPt] = img.id
  }

  const resultados: string[] = []
  const erros: string[] = []

  // 5. Para cada cor com foto_frente, faz upload e vincula nas variações
  for (const cor of cores) {
    if (!cor.foto_frente) continue

    try {
      // Upload da foto principal (frente) para Nuvemshop
      // Nuvemshop aceita URL pública diretamente
      let imageId: number

      if (corImageNSMap[cor.cor]) {
        // Imagem já existe com esse alt na Nuvemshop — reutiliza
        imageId = corImageNSMap[cor.cor]
        resultados.push(`${cor.cor}: imagem já existia (id ${imageId})`)
      } else {
        // Upload nova imagem
        const uploadRes = await ns('POST', `/products/${nsId}/images`, {
          src: cor.foto_frente,
          alt: { pt: cor.cor, es: cor.cor, en: cor.cor },
        })
        imageId = uploadRes.id
        resultados.push(`${cor.cor}: nova imagem enviada (id ${imageId})`)
      }

      await sleep(800)

      // 6. Vincula image_id a TODAS as variações desta cor na Nuvemshop
      const variantIds = corVariantMap[cor.cor] || []
      for (const variantId of variantIds) {
        try {
          await ns('PUT', `/products/${nsId}/variants/${variantId}`, { image_id: imageId })
          await sleep(500)
        } catch (e: unknown) {
          erros.push(`Variação ${variantId} (${cor.cor}): ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // 7. Também envia foto_costas e foto_detalhe como imagens adicionais do produto
      // (aparecerão na galeria do produto, não vinculadas à variação específica)
      if (cor.foto_costas && cor.foto_costas !== cor.foto_frente) {
        const altCostas = `${cor.cor} - costas`
        if (!corImageNSMap[altCostas]) {
          try {
            await ns('POST', `/products/${nsId}/images`, {
              src: cor.foto_costas,
              alt: { pt: altCostas, es: altCostas, en: altCostas },
            })
            await sleep(600)
          } catch {
            // Não é crítico — continua
          }
        }
      }

      if (cor.foto_detalhe && cor.foto_detalhe !== cor.foto_frente) {
        const altDetalhe = `${cor.cor} - detalhe`
        if (!corImageNSMap[altDetalhe]) {
          try {
            await ns('POST', `/products/${nsId}/images`, {
              src: cor.foto_detalhe,
              alt: { pt: altDetalhe, es: altDetalhe, en: altDetalhe },
            })
            await sleep(600)
          } catch {
            // Não é crítico — continua
          }
        }
      }

    } catch (e: unknown) {
      erros.push(`Cor "${cor.cor}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return res.status(200).json({
    ok: erros.length === 0,
    cores_processadas: cores.filter(c => c.foto_frente).length,
    resultados,
    erros,
  })
}

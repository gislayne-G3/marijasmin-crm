import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const STORE_ID = process.env.NUVEMSHOP_STORE_ID || '7344725'
const TOKEN   = process.env.NUVEMSHOP_ACCESS_TOKEN!
const UA      = 'Ecossistema Marijasmin (gislayne.marijasmin@gmail.com)'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function nsGet(path: string) {
  const res = await fetch(`https://api.tiendanube.com/v1/${STORE_ID}${path}`, {
    headers: { 'Authentication': `bearer ${TOKEN}`, 'User-Agent': UA },
  })
  if (!res.ok) throw new Error(`Nuvemshop ${path} → ${res.status}`)
  return res.json()
}

function detectarCategoria(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('conjunto')) return 'conjuntos'
  if (n.includes('vestido') || n.includes('dress')) return 'vestidos'
  if (n.includes('macacão') || n.includes('macacao') || n.includes('jumpsuit')) return 'macacoes'
  if (n.includes('blusa') || n.includes('top') || n.includes('cropped')) return 'blusas'
  if (n.includes('calça') || n.includes('calca') || n.includes('saia') || n.includes('shorts')) return 'calcas'
  return 'outros'
}

function parseVariant(variant: Record<string, unknown>): { cor: string; tamanho: string } {
  let cor = '', tamanho = ''
  const values = (variant.values as Array<Record<string, string>>) || []
  for (const val of values) {
    const v = val.pt || val.es || val.en || ''
    if (['P', 'M', 'G', 'GG', 'XG', 'XGG', 'U', 'PP'].includes(v.toUpperCase())) {
      tamanho = v.toUpperCase()
    } else if (v) {
      cor = v
    }
  }
  return { cor, tamanho }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  // 1. Busca nuvemshop_ids já no Supabase
  const { data: existentes } = await supabase
    .from('produtos')
    .select('nuvemshop_id')
    .not('nuvemshop_id', 'is', null)

  const existentesSet = new Set((existentes || []).map(p => String(p.nuvemshop_id)))

  // 2. Busca todos os produtos da Nuvemshop
  let todos: Record<string, unknown>[] = []
  let page = 1
  while (true) {
    const prods = await nsGet(`/products?per_page=50&page=${page}&published=true`)
    if (!Array.isArray(prods) || !prods.length) break
    todos = [...todos, ...prods]
    if (prods.length < 50) break
    page++
    await new Promise(r => setTimeout(r, 400))
  }

  // 3. Filtra apenas produtos NOVOS (não existentes no Supabase)
  const novos = todos.filter(p => !existentesSet.has(String(p.id)))

  if (!novos.length) {
    return res.status(200).json({ ok: true, novos: 0, msg: 'Nenhum produto novo encontrado. Tudo já está no PIM!' })
  }

  let importados = 0
  let erros = 0
  const errosList: string[] = []

  for (const p of novos) {
    try {
      const nome         = (p.name as Record<string, string>)?.pt || (p.name as Record<string, string>)?.es || ''
      const categoria    = detectarCategoria(nome)
      const descricao    = (p.description as Record<string, string>)?.pt || null
      const nuvemshop_id = String(p.id)
      const sku          = (p.sku as string) || null
      const imagem_url   = ((p.images as Array<Record<string, string>>)?.[0]?.src) || null
      const ativo        = p.published !== false

      // Preço vem das variações
      const variants = (p.variants as Array<Record<string, unknown>>) || []
      const variantePreco = variants.find(v => v.price && parseFloat(String(v.price)) > 0)
      const preco_varejo  = variantePreco ? parseFloat(String(variantePreco.price)) : 0
      const estoque       = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)

      // Upsert produto
      const { data: produtoSalvo, error: errProd } = await supabase
        .from('produtos')
        .upsert({
          nome, categoria, descricao,
          preco_varejo, preco_atacado: 0,
          imagem_url, nuvemshop_id, sku, estoque, ativo,
          destaque: false,
        }, { onConflict: 'nuvemshop_id' })
        .select('id')
        .single()

      if (errProd || !produtoSalvo) throw errProd || new Error('Falha ao salvar produto')

      const produto_id = produtoSalvo.id

      // Processa variações → cores únicas
      const coresMap: Record<string, { variacoes: Array<{ tamanho: string; estoque: number; sku: string | null; nuvemshop_variant_id: string }> }> = {}

      for (const v of variants) {
        const { cor, tamanho } = parseVariant(v)
        if (!coresMap[cor]) coresMap[cor] = { variacoes: [] }
        coresMap[cor].variacoes.push({
          tamanho: tamanho || 'U',
          estoque: Number(v.stock) || 0,
          sku: (v.sku as string) || null,
          nuvemshop_variant_id: String(v.id),
        })
      }

      const fotos = (p.images as Array<Record<string, unknown>>) || []

      // Upsert cores + variações
      for (const [cor, dados] of Object.entries(coresMap)) {
        const fotoAlt = fotos.find(f => {
          const alt = Object.values(f.alt as Record<string, string> || {}).join(' ')
          return alt.toLowerCase().includes(cor.toLowerCase())
        })
        const foto_url = (fotoAlt?.src as string) || (fotos[0]?.src as string) || null

        const { data: corSalva, error: errCor } = await supabase
          .from('produtos_cores')
          .upsert({ produto_id, cor: cor || 'Única', foto_frente: foto_url }, { onConflict: 'produto_id,cor' })
          .select('id')
          .single()

        if (errCor || !corSalva) continue

        for (const varia of dados.variacoes) {
          await supabase.from('produtos_variacoes').upsert({
            produto_id,
            cor: cor || 'Única',
            tamanho: varia.tamanho,
            estoque: varia.estoque,
            sku: varia.sku,
            nuvemshop_variant_id: varia.nuvemshop_variant_id,
          }, { onConflict: 'produto_id,cor,tamanho' })
        }
      }

      importados++
    } catch (e: unknown) {
      erros++
      const nome = ((p.name as Record<string, string>)?.pt || '')
      errosList.push(`"${nome}": ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return res.status(200).json({
    ok: erros === 0,
    total_nuvemshop: todos.length,
    ja_existiam: existentesSet.size,
    novos_encontrados: novos.length,
    importados,
    erros,
    errosList: errosList.slice(0, 10),
  })
}

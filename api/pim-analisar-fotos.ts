import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_auth'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Inicializado dentro do handler para evitar crash no module load quando env var ausente

const STORE_ID = process.env.NUVEMSHOP_STORE_ID || '7344725'
const TOKEN = process.env.NUVEMSHOP_ACCESS_TOKEN!
const UA = 'Ecossistema Marijasmin (gislayne.marijasmin@gmail.com)'

type SlotFoto = 'foto_frente' | 'foto_costas' | 'foto_detalhe'

interface FotoAnalise {
  index: number
  src: string
  cor: string
  posicao: 'frente' | 'costas' | 'detalhe' | 'tabela_medidas' | 'ignorar'
}

interface MedidaTabela {
  tamanho: string
  medidas: Record<string, string>
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return Buffer.from(buf).toString('base64')
  } catch {
    return null
  }
}

function mediaTypeFromUrl(url: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (url.includes('.png')) return 'image/png'
  if (url.includes('.webp')) return 'image/webp'
  if (url.includes('.gif')) return 'image/gif'
  return 'image/jpeg'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor. Configure no Vercel → Environment Variables.' })
  }

  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { produto_id } = req.body
  if (!produto_id) return res.status(400).json({ error: 'produto_id obrigatório' })

  // 1. Busca produto no Supabase
  const { data: produto } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', produto_id)
    .single()

  if (!produto?.nuvemshop_id) {
    return res.status(400).json({ error: 'Produto sem nuvemshop_id' })
  }

  // 2. Busca produto na Nuvemshop
  const nsRes = await fetch(`https://api.tiendanube.com/v1/${STORE_ID}/products/${produto.nuvemshop_id}`, {
    headers: { 'Authentication': `bearer ${TOKEN}`, 'User-Agent': UA },
  })
  const nsProduto = await nsRes.json()

  const fotos: Array<{ src: string; alt: string }> = (nsProduto.images || []).map((img: { src: string; alt: Record<string, string> }) => ({
    src: img.src,
    alt: Object.values(img.alt || {}).join(' '),
  }))

  const variants = nsProduto.variants || []

  // Extrai cores únicas das variações
  const coresDisponiveis: string[] = []
  for (const v of variants) {
    for (const val of v.values || []) {
      const valStr = val.pt || val.es || val.en || ''
      const isTamanho = ['P', 'M', 'G', 'GG', 'XG', 'XGG', 'U', 'PP'].includes(valStr.toUpperCase())
      if (!isTamanho && valStr && !coresDisponiveis.includes(valStr)) {
        coresDisponiveis.push(valStr)
      }
    }
  }

  if (!fotos.length) {
    return res.status(200).json({ ok: true, msg: 'Nenhuma foto na Nuvemshop', cores_atualizadas: [] })
  }

  // 3. Baixa fotos (máximo 20 para Claude)
  const fotosParaAnalisar = fotos.slice(0, 20)
  const fotosBase64: Array<{ src: string; base64: string | null }> = []

  for (const f of fotosParaAnalisar) {
    const b64 = await fetchImageAsBase64(f.src)
    fotosBase64.push({ src: f.src, base64: b64 })
    await new Promise(r => setTimeout(r, 100))
  }

  const fotosValidas = fotosBase64.filter(f => f.base64 !== null)
  if (!fotosValidas.length) {
    return res.status(200).json({ ok: false, error: 'Não foi possível baixar nenhuma foto' })
  }

  // 4. Envia todas as fotos para Claude Vision de uma vez
  const imagensContent: Anthropic.ImageBlockParam[] = fotosValidas.map(f => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaTypeFromUrl(f.src),
      data: f.base64!,
    },
  }))

  const prompt = `Você é um especialista em classificação de fotos de moda feminina para e-commerce.

Produto: "${produto.nome}"
Categoria: ${produto.categoria}
Cores disponíveis no produto: ${coresDisponiveis.length > 0 ? coresDisponiveis.join(', ') : 'não identificadas - use sua análise visual'}

Analise CADA FOTO numerada acima (foto 1, 2, 3... na ordem que aparecem) e retorne um JSON com a análise de cada uma.

Para cada foto identifique:
1. "cor": a cor/estampa da peça de roupa visível (ex: "Bege", "Terracota", "Verde Militar", "Chocolate"). Use EXATAMENTE os nomes das cores disponíveis quando possível. Se for uma tabela de medidas, use "tabela_medidas". Se não for roupa, use "ignorar".
2. "posicao":
   - "frente" = modelo vista de frente ou foto do produto de frente
   - "costas" = modelo vista de costas
   - "detalhe" = close-up de detalhe, tecido, acabamento, ou laterais
   - "tabela_medidas" = imagem de tabela de medidas (cm)
   - "ignorar" = logo, banner, fundo branco sem roupa etc

Se for tabela_medidas, inclua também "medidas_extraidas" com os dados da tabela em formato:
{
  "tamanhos": ["M", "G", "GG"],
  "campos": {
    "Busto": {"M": "90", "G": "94", "GG": "98"},
    "Cintura": {"M": "74", "G": "78", "GG": "82"},
    "Quadril": {"M": "98", "G": "102", "GG": "106"},
    "Comprimento": {"M": "110", "G": "112", "GG": "114"}
  }
}

Responda APENAS com JSON válido, sem explicações:
{
  "fotos": [
    {"index": 1, "cor": "Bege", "posicao": "frente"},
    {"index": 2, "cor": "Bege", "posicao": "costas"},
    {"index": 3, "cor": "tabela_medidas", "posicao": "tabela_medidas", "medidas_extraidas": {...}},
    ...
  ]
}`

  const claudeRes = await claude.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          ...imagensContent,
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const responseText = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : ''

  // 5. Parse do JSON retornado pelo Claude
  let analise: { fotos: FotoAnalise[] }
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    analise = jsonMatch ? JSON.parse(jsonMatch[0]) : { fotos: [] }
  } catch {
    return res.status(500).json({ error: 'Erro ao parsear resposta do Claude', raw: responseText.slice(0, 500) })
  }

  // 6. Organiza fotos por cor → slots
  // Para cada cor, prioriza: a 1ª foto como frente, depois costas, depois detalhe
  const corSlotMap: Record<string, Record<SlotFoto, string>> = {}
  let tabelaMedidas: MedidaTabela[] | null = null

  for (const f of analise.fotos || []) {
    const fotoOriginal = fotosValidas[f.index - 1]
    if (!fotoOriginal) continue

    if (f.posicao === 'tabela_medidas' && f.cor === 'tabela_medidas') {
      // Extrai medidas da tabela
      const medidas = (f as FotoAnalise & { medidas_extraidas?: { tamanhos: string[]; campos: Record<string, Record<string, string>> } }).medidas_extraidas
      if (medidas) {
        tabelaMedidas = medidas.tamanhos.map((tam: string) => ({
          tamanho: tam,
          medidas: Object.fromEntries(
            Object.entries(medidas.campos).map(([campo, vals]) => [
              campo.toLowerCase().replace(/\s+/g, '_'),
              (vals as Record<string, string>)[tam] || ''
            ])
          ),
        }))
      }
      continue
    }

    if (f.posicao === 'ignorar' || f.cor === 'ignorar') continue

    const cor = f.cor
    if (!corSlotMap[cor]) corSlotMap[cor] = {} as Record<SlotFoto, string>

    const slotPrioridade: SlotFoto[] = ['foto_frente', 'foto_costas', 'foto_detalhe']
    const slotAlvo: SlotFoto = f.posicao === 'frente' ? 'foto_frente'
      : f.posicao === 'costas' ? 'foto_costas'
      : 'foto_detalhe'

    // Só ocupa o slot se ainda estiver vazio
    if (!corSlotMap[cor][slotAlvo]) {
      corSlotMap[cor][slotAlvo] = fotoOriginal.src
    } else {
      // Slot ocupado: procura próximo slot disponível
      for (const slot of slotPrioridade) {
        if (!corSlotMap[cor][slot]) {
          corSlotMap[cor][slot] = fotoOriginal.src
          break
        }
      }
    }
  }

  // 7. Salva cores + fotos no Supabase (upsert por cor)
  const coresAtualizadas: string[] = []

  for (const [cor, slots] of Object.entries(corSlotMap)) {
    const { error } = await supabase
      .from('produtos_cores')
      .upsert({
        produto_id,
        cor,
        foto_frente: slots.foto_frente || null,
        foto_costas: slots.foto_costas || null,
        foto_detalhe: slots.foto_detalhe || null,
      }, { onConflict: 'produto_id,cor' })

    if (!error) coresAtualizadas.push(cor)
  }

  // 8. Se encontrou tabela de medidas, salva e remove a img da descrição
  if (tabelaMedidas) {
    // Salva medidas
    await supabase.from('produtos_medidas').delete().eq('produto_id', produto_id)
    await supabase.from('produtos_medidas').insert(
      tabelaMedidas.map(m => ({ produto_id, tamanho: m.tamanho, medidas: m.medidas }))
    )

    // Remove imagens de tabela da descrição HTML
    if (produto.descricao) {
      // Remove <img> tags que provavelmente são tabelas de medidas
      // Heurística: imagens com "medid" no src ou próximas de texto "medida", "tamanho", "cm"
      const descSemTabela = produto.descricao
        .replace(/<img[^>]*tabela[^>]*>/gi, '')
        .replace(/<img[^>]*medid[^>]*>/gi, '')
        .replace(/<img[^>]*tamanh[^>]*>/gi, '')

      // Se o Claude encontrou a tabela, remove TODAS as imgs que não são fotos de roupa
      // (imagens de medidas geralmente ficam no fim da descrição)
      if (descSemTabela !== produto.descricao) {
        await supabase.from('produtos')
          .update({ descricao: descSemTabela })
          .eq('id', produto_id)
      }
    }
  }

  return res.status(200).json({
    ok: true,
    fotos_analisadas: fotosValidas.length,
    cores_detectadas: Object.keys(corSlotMap),
    cores_atualizadas: coresAtualizadas,
    tabela_medidas_extraida: tabelaMedidas !== null,
    medidas_tamanhos: tabelaMedidas?.map(m => m.tamanho),
    analise_raw: analise.fotos?.map(f => ({ index: f.index, cor: f.cor, posicao: f.posicao })),
  })
}

import { supabase } from './supabase'

export interface Produto {
  id: number
  nome: string
  sku: string | null
  categoria: string
  preco_atacado: number
  preco_varejo: number
  preco_promocional: number | null
  preco_promo_inicio: string | null
  preco_promo_fim: string | null
  estoque: number
  imagem_url: string | null
  ativo: boolean
  descricao: string | null
  descricao_curta: string | null
  destaque: boolean
  modelo_nome: string | null
  modelo_tamanho: string | null
  modelo_altura: string | null
  tiny_id: string | null
  nuvemshop_id: string | null
  seo_title: string | null
  seo_meta_description: string | null
  seo_slug: string | null
  seo_alt_text: string | null
  composicao: string | null
  modelagem: string | null
  comprimento_tipo: string | null
  manga: string | null
  ocasioes: string[] | null
  detalhes_tecido: string | null
  cuidados_peca: string | null
  notas_fotos: string | null
  description_generated_at: string | null
  nuvemshop_last_sync: string | null
  updated_at?: string
}

export interface ProdutoCor {
  id?: string
  produto_id: number
  cor: string
  cor_hex: string | null
  foto_frente: string | null
  foto_costas: string | null
  foto_detalhe: string | null
}

export interface ProdutoVariacao {
  id?: string
  produto_id?: number
  cor_id?: string
  cor: string
  tamanho: string
  estoque: number
  sku?: string | null
  nuvemshop_variant_id?: string | null
}

export interface ProdutoMedida {
  id?: string
  produto_id: number
  tamanho: string
  medidas: Record<string, string>
}

export const TAMANHOS = ['P', 'M', 'G', 'GG'] as const

// Medidas padrão Marijasmin (em cm, da peça)
export const MEDIDAS_PADRAO: Record<string, Record<string, string>> = {
  P:  { busto: '84-88', cintura: '66-70', quadril: '90-94' },
  M:  { busto: '88-92', cintura: '70-74', quadril: '94-98' },
  G:  { busto: '96-100', cintura: '78-82', quadril: '102-106' },
  GG: { busto: '104-108', cintura: '86-90', quadril: '110-114' },
}

export const OCASIOES_DISPONIVEIS = [
  'Para o culto',
  'Para festas',
  'Para o trabalho',
  'Para o dia a dia',
  'Casual',
] as const

export const CAMPOS_MEDIDAS: Record<string, string[]> = {
  vestidos:  ['busto', 'cintura', 'quadril', 'comprimento'],
  conjuntos: ['busto', 'cintura', 'quadril', 'comprimento_blusa', 'comprimento_saia'],
  macacoes:  ['busto', 'cintura', 'quadril', 'comprimento_total'],
  blusas:    ['busto', 'ombro', 'comprimento', 'manga'],
  calcas:    ['cintura', 'quadril', 'comprimento', 'entreperna'],
}

export const LABEL_MEDIDAS: Record<string, string> = {
  busto: 'Busto', cintura: 'Cintura', quadril: 'Quadril',
  comprimento: 'Comprimento', comprimento_blusa: 'Comprimento Blusa',
  comprimento_saia: 'Comprimento Saia', comprimento_total: 'Comprimento Total',
  entreperna: 'Entreperna', ombro: 'Ombro', manga: 'Manga',
}

export const CAT_ICON: Record<string, string> = {
  vestidos: '👗', conjuntos: '🩱', macacoes: '🦱', blusas: '👚', calcas: '👖',
}

export interface ProdutoComCount extends Produto {
  num_variacoes: number
}

export async function buscarProdutos(busca = '', categoria = ''): Promise<ProdutoComCount[]> {
  // Filtra apenas produtos pai (com nuvemshop_id), excluindo variações do Tiny
  let q = supabase.from('produtos').select('*').eq('ativo', true).not('nuvemshop_id', 'is', null).order('nome')
  if (busca.trim()) q = q.or(`nome.ilike.%${busca}%,sku.ilike.%${busca}%`)
  if (categoria) q = q.eq('categoria', categoria)
  const { data: prods } = await q.limit(300)
  if (!prods?.length) return []

  // Busca contagem de variações por produto
  const ids = prods.map(p => p.id)
  const { data: varCounts } = await supabase
    .from('produtos_variacoes')
    .select('produto_id')
    .in('produto_id', ids)

  const countMap: Record<number, number> = {}
  for (const v of varCounts || []) {
    countMap[v.produto_id] = (countMap[v.produto_id] || 0) + 1
  }

  return prods.map(p => ({ ...p, num_variacoes: countMap[p.id] || 0 })) as ProdutoComCount[]
}

export async function buscarProduto(id: number) {
  const [p, coresResult, variacoesResult, medidasResult] = await Promise.all([
    supabase.from('produtos').select('*').eq('id', id).single(),
    supabase.from('produtos_cores').select('*').eq('produto_id', id),
    supabase.from('produtos_variacoes').select('*').eq('produto_id', id),
    supabase.from('produtos_medidas').select('*').eq('produto_id', id),
  ])

  const cores = (coresResult.data || []) as ProdutoCor[]

  // Mapa: cor_id (UUID) → nome da cor — sem depender do FK join do Supabase
  const corIdMap: Record<string, string> = {}
  for (const c of cores) {
    if (c.id) corIdMap[c.id] = c.cor
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variacoes: ProdutoVariacao[] = (variacoesResult.data || []).map((v: any) => ({
    id: v.id,
    produto_id: v.produto_id,
    cor_id: v.cor_id,
    cor: corIdMap[v.cor_id] || '',   // resolve cor_id UUID → nome via mapa local
    tamanho: v.tamanho,
    estoque: v.estoque ?? 0,
    sku: v.sku,
    nuvemshop_variant_id: v.nuvemshop_variant_id,
  }))

  return {
    produto: p.data as Produto,
    cores,
    variacoes,
    medidas: (medidasResult.data || []) as ProdutoMedida[],
  }
}

export async function uploadFoto(produtoId: number, cor: string, slot: string, file: File) {
  const ext = file.name.split('.').pop() || 'jpg'
  const corSlug = cor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, '_').toLowerCase()
  const path = `${produtoId}/${corSlug}/${slot}.${ext}`
  await supabase.storage.from('produtos-fotos').remove([path])
  const { error } = await supabase.storage.from('produtos-fotos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('produtos-fotos').getPublicUrl(path)
  return data.publicUrl
}

export async function salvarProduto(id: number, updates: Partial<Produto>) {
  const { error } = await supabase.from('produtos').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function salvarCores(produtoId: number, cores: ProdutoCor[]) {
  // Upsert por produto_id+cor — preserva o UUID (id) que é usado como cor_id nas variações
  if (!cores.length) return
  const { error } = await supabase.from('produtos_cores').upsert(
    cores.map(c => ({ ...c, produto_id: produtoId })),
    { onConflict: 'produto_id,cor' }
  )
  if (error) throw error
}

export async function salvarVariacoes(produtoId: number, variacoes: ProdutoVariacao[]) {
  // NUNCA faz delete+insert — isso destruiria o cor_id (UUID FK)
  // Variações com id: atualiza estoque/sku
  // Variações sem id (novas): upsert por produto_id+cor+tamanho
  if (!variacoes.length) return

  const existentes = variacoes.filter(v => v.id)
  const novas = variacoes.filter(v => !v.id)

  for (const v of existentes) {
    await supabase.from('produtos_variacoes')
      .update({ estoque: v.estoque, sku: v.sku })
      .eq('id', v.id!)
  }

  if (novas.length) {
    // Novas variações: busca cor_id a partir do nome da cor
    const { data: coresDb } = await supabase
      .from('produtos_cores')
      .select('id, cor')
      .eq('produto_id', produtoId)

    const corIdMap: Record<string, string> = {}
    for (const c of coresDb || []) corIdMap[c.cor] = c.id

    const rows = novas
      .filter(v => corIdMap[v.cor]) // só insere se encontrar o cor_id
      .map(v => ({
        produto_id: produtoId,
        cor_id: corIdMap[v.cor],
        tamanho: v.tamanho,
        estoque: v.estoque,
        sku: v.sku,
        nuvemshop_variant_id: v.nuvemshop_variant_id || null,
      }))

    if (rows.length) {
      await supabase.from('produtos_variacoes').upsert(rows, { onConflict: 'produto_id,cor_id,tamanho' })
    }
  }
}

export async function salvarEstoqueVariacoes(variacoes: ProdutoVariacao[]) {
  for (const v of variacoes) {
    if (v.id) {
      await supabase
        .from('produtos_variacoes')
        .update({ estoque: v.estoque })
        .eq('id', v.id)
    }
  }
}

export async function salvarMedidas(produtoId: number, medidas: Omit<ProdutoMedida, 'id'>[]) {
  await supabase.from('produtos_medidas').delete().eq('produto_id', produtoId)
  if (!medidas.length) return
  const { error } = await supabase.from('produtos_medidas').insert(medidas.map(m => ({ ...m, produto_id: produtoId })))
  if (error) throw error
}

// Guia de como medir (por campo)
const GUIA_MEDIDAS: Record<string, string> = {
  busto: 'Meça ao redor da parte mais larga do peito, com os braços relaxados.',
  cintura: 'Meça na parte mais estreita do tronco, geralmente 3 cm acima do umbigo.',
  quadril: 'Meça ao redor da parte mais larga dos quadris e glúteos.',
  comprimento: 'Meça do ombro até a barra, com a peça esticada na horizontal.',
  comprimento_blusa: 'Meça do ombro até a barra da blusa.',
  comprimento_saia: 'Meça do cós até a barra da saia.',
  comprimento_total: 'Meça do ombro até a barra, com a peça esticada verticalmente.',
  entreperna: 'Meça da virilha até o tornozelo, pela parte interna da perna.',
  ombro: 'Meça de uma ponta do ombro à outra, pela parte traseira.',
  manga: 'Meça do ombro até o punho, com o braço levemente dobrado.',
}

// Labels de categoria para tabela de medidas
const CAT_LABEL_TABELA: Record<string, string> = {
  vestidos: 'VESTIDO', conjuntos: 'CONJUNTO', macacoes: 'MACACÃO',
  blusas: 'BLUSA', calcas: 'CALÇA', saias: 'SAIA',
}

// Cuidados padrão quando o campo estiver vazio
const CUIDADOS_PADRAO = [
  'Lavar à mão ou na máquina no ciclo delicado',
  'Usar sabão neutro',
  'Não torcer — retire o excesso de água com uma toalha',
  'Secar na sombra, em cabide',
  'Passar em temperatura baixa, pelo avesso',
  'Não usar alvejante',
]

export function gerarHtmlDescricao(
  produto: Produto,
  descricaoHtml: string,
  _cores: ProdutoCor[],
  medidas: ProdutoMedida[],
  campos: string[]
): string {
  // ── PALETA MARIJASMIN ─────────────────────────────────────────────────────
  const COR       = '#810947'
  const COR_DARK  = '#5a0630'
  const COR_BG    = '#fdf0f5'
  const COR_BORDA = '#e8c0d2'

  // ── ESTILOS DO ACCORDION ──────────────────────────────────────────────────
  const accordionHeader = `cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid ${COR_BORDA};font-size:13px;font-weight:700;color:${COR_DARK};letter-spacing:0.5px;text-transform:uppercase;background:#fff`
  const accordionBody = `padding:16px 18px;font-size:13px;color:#444;line-height:1.8`
  const accordionPlus = `font-size:18px;color:${COR};font-weight:400`

  // ── LIMPEZA: remove tudo injetado em saves anteriores ─────────────────────
  let descLimpa = descricaoHtml
    .replace(/\s*<div class="mj-accordion[\s\S]*$/, '')
    .replace(/<div style="clear:both[^>]*>[\s\S]*$/, '')
    .replace(/<div style="margin-top:3[26]px[\s\S]*$/, '')
    .replace(/<div class="secao-foto">/g, '<div>')
    .replace(/<img[^>]*alt="Foto do produto"[^>]*\/?>/g, '')
    .replace(/<div style="display:flex[^>]*>\s*<img[^>]*>\s*<div style="flex:1[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g, '<div>$1</div>')
    .trim()

  // ── SEÇÃO 1: DESCRIÇÃO DO PRODUTO (sempre aberta) ────────────────────────
  let html = `<div class="mj-accordion" style="border:1px solid ${COR_BORDA};border-radius:8px;overflow:hidden;font-family:sans-serif">`

  html += `<div style="${accordionHeader};background:${COR_BG}">DESCRIÇÃO DO PRODUTO</div>`
  html += `<div style="${accordionBody}">`
  if (produto.nome) html += `<h3 style="font-size:16px;font-weight:700;color:${COR_DARK};margin:0 0 10px">${produto.nome}</h3>`
  html += descLimpa || '<p style="color:#999">Sem descrição.</p>'
  html += `</div>`

  // ── SEÇÃO 2: DETALHES DO PRODUTO ─────────────────────────────────────────
  const detalhes: string[] = []
  if (produto.modelagem)        detalhes.push(`<strong>Modelagem:</strong> ${produto.modelagem}`)
  if (produto.comprimento_tipo) detalhes.push(`<strong>Comprimento:</strong> ${produto.comprimento_tipo}`)
  if (produto.manga)            detalhes.push(`<strong>Manga:</strong> ${produto.manga}`)
  if (produto.categoria)        detalhes.push(`<strong>Categoria:</strong> ${CAT_LABEL_TABELA[produto.categoria] || produto.categoria}`)
  if (produto.modelo_tamanho)   detalhes.push(`<strong>Modelo veste:</strong> ${produto.modelo_tamanho}${produto.modelo_altura ? ` (${produto.modelo_altura})` : ''}`)
  if (produto.ocasioes?.length) detalhes.push(`<strong>Ideal para:</strong> ${produto.ocasioes.join(', ')}`)

  if (detalhes.length) {
    html += `<div style="${accordionHeader}"><span>DETALHES DO PRODUTO</span><span style="${accordionPlus}">+</span></div>`
    html += `<div style="${accordionBody}">`
    html += detalhes.map(d => `<p style="margin:0 0 6px">${d}</p>`).join('')
    html += `</div>`
  }

  // ── SEÇÃO 3: DETALHES DO TECIDO ──────────────────────────────────────────
  const tecido: string[] = []
  if (produto.composicao) tecido.push(`<strong>Composição:</strong> ${produto.composicao}`)
  if (produto.detalhes_tecido) {
    produto.detalhes_tecido.split('\n').filter(l => l.trim()).forEach(l => tecido.push(l.trim()))
  }

  if (tecido.length) {
    html += `<div style="${accordionHeader}"><span>DETALHES DO TECIDO</span><span style="${accordionPlus}">+</span></div>`
    html += `<div style="${accordionBody}">`
    html += tecido.map(t => `<p style="margin:0 0 6px">${t}</p>`).join('')
    html += `</div>`
  }

  // ── SEÇÃO 4: TABELA DE MEDIDAS ───────────────────────────────────────────
  const temMedida = medidas.some(m =>
    campos.some(c => {
      const v = String(m.medidas?.[c] || '').trim()
      return v !== '' && v !== '0'
    })
  )

  if (temMedida) {
    const medidasUnicas = medidas.filter(
      (m, idx, arr) => arr.findIndex(x => x.tamanho === m.tamanho) === idx
    )

    const catLabel = CAT_LABEL_TABELA[produto.categoria] || produto.categoria?.toUpperCase() || ''

    html += `<div style="${accordionHeader}"><span>TABELA DE MEDIDAS (EM CM)</span><span style="${accordionPlus}">+</span></div>`
    html += `<div style="${accordionBody}">`

    if (catLabel) html += `<p style="font-size:12px;font-weight:700;color:${COR};margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px">${catLabel}</p>`

    html += `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid ${COR_BORDA};border-radius:6px;overflow:hidden">`
    html += `<thead><tr style="background:${COR};color:white">`
    html += `<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.5px">TAM.</th>`
    html += campos.map(c => `<th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:600;letter-spacing:0.5px">${LABEL_MEDIDAS[c] || c}</th>`).join('')
    html += `</tr></thead><tbody>`

    medidasUnicas.forEach((m, rowIdx) => {
      const bgRow = rowIdx % 2 === 0 ? '#fff' : COR_BG
      html += `<tr style="background:${bgRow}">`
      html += `<td style="font-weight:700;padding:10px 14px;border-bottom:1px solid ${COR_BORDA};color:${COR_DARK}">${m.tamanho}</td>`
      html += campos.map(c =>
        `<td style="padding:10px 14px;border-bottom:1px solid ${COR_BORDA};text-align:center;color:#333">${m.medidas?.[c] ? m.medidas[c] : '—'}</td>`
      ).join('')
      html += `</tr>`
    })

    html += `</tbody></table>`

    // ── Como Medir ──
    const guiaItens = campos
      .filter(c => GUIA_MEDIDAS[c])
      .map(c => `<li><strong>${LABEL_MEDIDAS[c] || c}:</strong> ${GUIA_MEDIDAS[c]}</li>`)
      .join('')

    if (guiaItens) {
      html += `<div style="margin-top:16px;padding:14px 18px;background:${COR_BG};border-left:3px solid ${COR};border-radius:0 6px 6px 0">`
      html += `<p style="font-size:13px;font-weight:700;color:${COR_DARK};margin:0 0 8px">Como Medir</p>`
      html += `<ul style="margin:0;padding-left:18px;font-size:12px;color:#444;line-height:1.9">${guiaItens}</ul>`
      html += `</div>`
    }

    html += `</div>`
  }

  // ── SEÇÃO 5: CUIDADOS COM A PEÇA ─────────────────────────────────────────
  const cuidadosTexto = produto.cuidados_peca?.trim()
  const cuidadosLista = cuidadosTexto
    ? cuidadosTexto.split('\n').filter(l => l.trim())
    : CUIDADOS_PADRAO

  html += `<div style="${accordionHeader}"><span>CUIDADOS COM A PEÇA</span><span style="${accordionPlus}">+</span></div>`
  html += `<div style="${accordionBody}">`
  html += `<ul style="margin:0;padding-left:18px;line-height:2">`
  html += cuidadosLista.map(c => `<li>${c}</li>`).join('')
  html += `</ul>`
  html += `</div>`

  html += `</div>` // fecha mj-accordion
  return html
}

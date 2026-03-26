import { supabase } from './supabase'

export interface Produto {
  id: number
  nome: string
  sku: string | null
  categoria: string
  preco_atacado: number
  preco_varejo: number
  estoque: number
  imagem_url: string | null
  ativo: boolean
  descricao: string | null
  descricao_curta: string | null
  destaque: boolean
  modelo_nome: string | null
  tiny_id: string | null
  nuvemshop_id: string | null
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
  produto_id: number
  cor: string
  tamanho: string
  estoque: number
  sku: string | null
  nuvemshop_variant_id?: string | null
}

export interface ProdutoMedida {
  id?: string
  produto_id: number
  tamanho: string
  medidas: Record<string, string>
}

export const TAMANHOS = ['M', 'G', 'GG'] as const

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
  const [p, cores, variacoes, medidas] = await Promise.all([
    supabase.from('produtos').select('*').eq('id', id).single(),
    supabase.from('produtos_cores').select('*').eq('produto_id', id),
    supabase.from('produtos_variacoes').select('*').eq('produto_id', id),
    supabase.from('produtos_medidas').select('*').eq('produto_id', id),
  ])
  return {
    produto: p.data as Produto,
    cores: (cores.data || []) as ProdutoCor[],
    variacoes: (variacoes.data || []) as ProdutoVariacao[],
    medidas: (medidas.data || []) as ProdutoMedida[],
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

export async function salvarCores(produtoId: number, cores: Omit<ProdutoCor, 'id'>[]) {
  await supabase.from('produtos_cores').delete().eq('produto_id', produtoId)
  if (!cores.length) return
  const { error } = await supabase.from('produtos_cores').insert(cores.map(c => ({ ...c, produto_id: produtoId })))
  if (error) throw error
}

export async function salvarVariacoes(produtoId: number, variacoes: Omit<ProdutoVariacao, 'id'>[]) {
  await supabase.from('produtos_variacoes').delete().eq('produto_id', produtoId)
  if (!variacoes.length) return
  const { error } = await supabase.from('produtos_variacoes').insert(variacoes.map(v => ({ ...v, produto_id: produtoId })))
  if (error) throw error
}

export async function salvarMedidas(produtoId: number, medidas: Omit<ProdutoMedida, 'id'>[]) {
  await supabase.from('produtos_medidas').delete().eq('produto_id', produtoId)
  if (!medidas.length) return
  const { error } = await supabase.from('produtos_medidas').insert(medidas.map(m => ({ ...m, produto_id: produtoId })))
  if (error) throw error
}

export function gerarHtmlDescricao(
  _produto: Produto,
  descricaoHtml: string,
  cores: ProdutoCor[],
  medidas: ProdutoMedida[],
  campos: string[]
): string {
  // Coleta fotos da primeira cor disponível (frente → costas → detalhe)
  const cor = cores[0]
  const fotosDisp: string[] = []
  if (cor) {
    if (cor.foto_frente)  fotosDisp.push(cor.foto_frente)
    if (cor.foto_costas)  fotosDisp.push(cor.foto_costas)
    if (cor.foto_detalhe) fotosDisp.push(cor.foto_detalhe)
  }

  // Injeta uma foto circular DENTRO de cada <div class="secao-foto">
  // (float:right, pequena, entre o texto — como num e-commerce real)
  let fotoIdx = 0
  const htmlComFotos = descricaoHtml.replace(/<div class="secao-foto">/g, () => {
    const foto = fotosDisp[fotoIdx]
    fotoIdx++
    if (!foto) return '<div class="secao-foto">'
    const fotoTag = `<img src="${foto}" style="width:130px;height:130px;border-radius:50%;object-fit:cover;float:right;margin:0 0 12px 18px;border:3px solid #f0e8ed;flex-shrink:0" alt="Foto do produto" />`
    return `<div class="secao-foto" style="overflow:hidden">${fotoTag}`
  })

  // Limpa float ao final de cada seção
  const htmlFinal = htmlComFotos
    .replace(/<\/div>/g, (match, offset, str) => {
      // Adiciona clearfix apenas nas secao-foto
      const antes = str.substring(0, offset)
      const ultimaAbertura = antes.lastIndexOf('<div class="secao-foto"')
      const ultimoFechamento = antes.lastIndexOf('</div>')
      if (ultimaAbertura > ultimoFechamento) {
        return '<div style="clear:both"></div></div>'
      }
      return match
    })

  // Tabela de medidas — SÓ aparece se tiver ao menos um campo preenchido
  const temMedida = medidas.some(m =>
    campos.some(c => m.medidas?.[c] && String(m.medidas[c]).trim() !== '' && String(m.medidas[c]).trim() !== '0')
  )

  if (!temMedida) return htmlFinal

  const tabelaRows = medidas.map(m =>
    `<tr><td style="font-weight:700;padding:8px 12px;border-bottom:1px solid #f0e8ed">${m.tamanho}</td>${
      campos.map(c => `<td style="padding:8px 12px;border-bottom:1px solid #f0e8ed;text-align:center">${m.medidas[c] ? m.medidas[c] + 'cm' : '—'}</td>`).join('')
    }</tr>`
  ).join('')

  const tabelaHtml = `
<div style="margin-top:24px;clear:both">
<h3 style="font-size:14px;font-weight:700;color:#0e2955;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px">Tabela de Medidas</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #f0e8ed">
  <thead><tr style="background:#0e2955;color:white">
    <th style="padding:9px 12px;text-align:left;font-size:12px">Tamanho</th>
    ${campos.map(c => `<th style="padding:9px 12px;text-align:center;font-size:12px">${LABEL_MEDIDAS[c] || c}</th>`).join('')}
  </tr></thead>
  <tbody>${tabelaRows}</tbody>
</table>
<p style="font-size:11px;color:#9c8fa0;margin-top:6px">* Medidas em centímetros. Use como referência.</p>
</div>`

  return htmlFinal + tabelaHtml
}

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

// Correspondência padrão de tamanhos
const TAMANHO_NUMERO: Record<string, string> = {
  P: '36', M: '38', G: '40/42', GG: '44', XG: '46', XGG: '48',
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

export function gerarHtmlDescricao(
  _produto: Produto,
  descricaoHtml: string,
  cores: ProdutoCor[],
  medidas: ProdutoMedida[],
  campos: string[]
): string {
  // ── PALETA MARIJASMIN ─────────────────────────────────────────────────────
  const COR  = '#810947'       // vinho-rosa (cor principal da marca)
  const COR_DARK  = '#5a0630'  // versão mais escura para títulos
  const COR_BG    = '#fdf0f5'  // rosa clarinho para fundos
  const COR_BORDA = '#e8c0d2'  // borda suave rose
  const COR_MUTED = '#7a4060'  // texto secundário dentro da paleta

  // ── FOTOS DISPONÍVEIS (primeira cor com foto) ─────────────────────────────
  const cor = cores[0]
  const fotosDisp: string[] = []
  if (cor) {
    if (cor.foto_frente)  fotosDisp.push(cor.foto_frente)
    if (cor.foto_costas)  fotosDisp.push(cor.foto_costas)
    if (cor.foto_detalhe) fotosDisp.push(cor.foto_detalhe)
  }

  // ── LIMPEZA: remove tudo que foi injetado em saves anteriores ─────────────
  // 1. Apaga tabela de medidas (identificada pelo atributo único margin-top:32px)
  let html = descricaoHtml.replace(/\s*<div style="margin-top:32px[\s\S]*$/, '').trim()

  // 2. Normaliza abertura de <div class="secao-foto"> (remove qualquer style antigo)
  html = html.replace(/(<div class="secao-foto")[^>]*>/g, '$1>')

  // 3. Remove imgs injetadas (reconhecidas pelo alt "Foto do produto")
  html = html.replace(/<img[^>]*alt="Foto do produto"[^>]*\/?>/g, '')

  // 4. Remove clearfix legados
  html = html.replace(/<div style="clear:both"><\/div>/g, '')

  // 5. Desembrulha blocos flex gerados em saves anteriores (flex-wrapper → secao-foto limpo)
  html = html.replace(
    /<div style="display:flex[^>]*>\s*<img[^>]*>\s*<div style="flex:1[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g,
    '<div class="secao-foto">$1</div>'
  )

  // ── INJEÇÃO: flexbox (foto esquerda | texto direita) ─────────────────────
  // Flexbox NÃO vaza para fora do container — diferente de float.
  let fotoIdx = 0
  const htmlComFotos = html.replace(
    /<div class="secao-foto">([\s\S]*?)<\/div>/g,
    (_full: string, conteudo: string) => {
      const foto = fotosDisp[fotoIdx++]
      if (!foto) {
        return `<div style="margin-bottom:28px">${conteudo.trim()}</div>`
      }
      return (
        `<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:28px">` +
        `<img src="${foto}" style="width:130px;height:130px;border-radius:50%;` +
        `object-fit:cover;flex-shrink:0;border:3px solid ${COR_BORDA}" alt="Foto do produto" />` +
        `<div style="flex:1;min-width:0">${conteudo.trim()}</div>` +
        `</div>`
      )
    }
  )

  // ── TABELA DE MEDIDAS (apenas se houver ao menos um campo preenchido) ─────
  const temMedida = medidas.some(m =>
    campos.some(c => {
      const v = String(m.medidas?.[c] || '').trim()
      return v !== '' && v !== '0'
    })
  )

  if (!temMedida) return `<div style="clear:both;float:none">${htmlComFotos}</div>`

  const guiaTexto = campos
    .filter(c => GUIA_MEDIDAS[c])
    .map(c => `<li><strong>${LABEL_MEDIDAS[c] || c}:</strong> ${GUIA_MEDIDAS[c]}</li>`)
    .join('')

  // Deduplicar medidas por tamanho (evita linhas duplicadas na tabela)
  const medidasUnicas = medidas.filter(
    (m, idx, arr) => arr.findIndex(x => x.tamanho === m.tamanho) === idx
  )

  const tabelaRows = medidasUnicas.map((m, rowIdx) => {
    const numero = TAMANHO_NUMERO[m.tamanho] || ''
    const bgRow = rowIdx % 2 === 0 ? '#fff' : COR_BG
    return `<tr style="background:${bgRow}">
      <td style="font-weight:700;padding:10px 14px;border-bottom:1px solid ${COR_BORDA};white-space:nowrap;color:${COR_DARK}">${m.tamanho}</td>
      <td style="padding:10px 14px;border-bottom:1px solid ${COR_BORDA};text-align:center;color:${COR_MUTED};font-size:12px">${numero}</td>
      ${campos.map(c => `<td style="padding:10px 14px;border-bottom:1px solid ${COR_BORDA};text-align:center;color:#333">${m.medidas?.[c] ? m.medidas[c] + ' cm' : '—'}</td>`).join('')}
    </tr>`
  }).join('')

  const tabelaHtml = `
<div style="margin-top:36px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="font-size:18px">📏</span>
    <h3 style="font-size:15px;font-weight:700;color:${COR_DARK};margin:0;letter-spacing:0.3px">Tabela de Medidas</h3>
  </div>
  <p style="font-size:12px;color:${COR_MUTED};margin:0 0 14px">As medidas abaixo são da <strong>peça</strong>, não do corpo. Adicione 2–4 cm para conforto.</p>

  <div style="border:1px solid ${COR_BORDA};border-radius:10px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:${COR};color:white">
          <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;letter-spacing:0.5px">TAM.</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.5px">Nº</th>
          ${campos.map(c => `<th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.5px">${LABEL_MEDIDAS[c] || c}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${tabelaRows}</tbody>
    </table>
  </div>

  <div style="margin-top:14px;background:${COR_BG};border-left:3px solid ${COR};border-radius:0 8px 8px 0;padding:14px 18px">
    <p style="font-size:12px;font-weight:700;color:${COR_DARK};margin:0 0 8px">✂️ Como tirar suas medidas:</p>
    <ul style="margin:0;padding-left:18px;font-size:12px;color:#444;line-height:1.9">
      ${guiaTexto}
      <li><strong>Dica:</strong> use uma fita métrica flexível. Não aperte — deixe um dedo de folga para conforto.</li>
    </ul>
    <p style="font-size:11px;color:${COR_MUTED};margin:10px 0 0;font-style:italic">Ficou com dúvida sobre qual tamanho escolher? Fale conosco no WhatsApp — vamos te ajudar! 💜</p>
  </div>
</div>`

  return `<div style="clear:both;float:none">${htmlComFotos}${tabelaHtml}</div>`
}

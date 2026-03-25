import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nome, categoria, cores, tecido } = req.body
  if (!nome || !categoria) return res.status(400).json({ error: 'nome e categoria obrigatórios' })

  const coresText = Array.isArray(cores) && cores.length
    ? `Cores/estampas disponíveis: ${cores.join(', ')}.`
    : ''
  const tecidoText = tecido ? `Tecido: ${tecido}.` : ''

  const prompt = `Você é especialista em descrições de produtos de moda feminina cristã e modesta da marca Marijasmin.

Produto:
- Nome: ${nome}
- Categoria: ${categoria}
${coresText}
${tecidoText}

RETORNE APENAS o HTML abaixo, sem explicações, sem markdown, sem \`\`\`:

<h2>${nome} – [tagline elegante, máx 8 palavras]</h2>
<p>[Parágrafo principal: 3-4 frases. Conforto, elegância, versatilidade. Tom feminino e cristão.]</p>

<div class="secao-foto">
<h3>[TÍTULO SOBRE DESIGN/MODELAGEM — ex: DESIGN QUE VALORIZA SUA SILHUETA]</h3>
<p>[2-3 frases sobre design, caimento, recortes, modelagem.]</p>
</div>

<div class="secao-foto">
<h3>[TÍTULO SOBRE TECIDO/CONFORTO — ex: TECIDO PREMIUM PARA SEU CONFORTO]</h3>
<p>[2-3 frases sobre tecido, qualidade, sensação ao vestir.]</p>
</div>

<div class="secao-foto">
<h3>[TÍTULO SOBRE VERSATILIDADE — ex: PERFEITA PARA QUALQUER OCASIÃO]</h3>
<p>[2-3 frases sobre ocasiões de uso, como combinar, versatilidade.]</p>
</div>

Regras: tom acolhedor e cristão, sem exageros, máx 70 palavras por parágrafo.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })
    const html = (response.content[0] as { text: string }).text.trim()
    res.status(200).json({ html })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao gerar descrição' })
  }
}

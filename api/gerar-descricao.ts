import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_auth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { nome, categoria, cores, tecido, descricao_atual } = req.body
  if (!nome || !categoria) return res.status(400).json({ error: 'nome e categoria obrigatórios' })

  const coresText = Array.isArray(cores) && cores.length
    ? `Opções de cor/estampa: ${cores.join(', ')}.`
    : ''
  const tecidoText = tecido ? `Tecido/Material: ${tecido}.` : ''
  const melhorarText = descricao_atual
    ? `\nDescrição atual para melhorar (mantenha as informações verdadeiras, eleve o nível):\n${descricao_atual}`
    : ''

  const categoriaTipo: Record<string, string> = {
    vestidos: 'vestido',
    conjuntos: 'conjunto',
    macacoes: 'macacão',
    blusas: 'blusa',
    calcas: 'calça',
  }
  const tipo = categoriaTipo[categoria] || categoria

  const prompt = `Você é redatora sênior de moda feminina com 15 anos de experiência em e-commerce de alto padrão. Escreva a descrição do produto abaixo para a loja online Marijasmin — moda feminina cristã, elegante e modesta com sede no Ceará.

Produto: ${nome}
Tipo: ${tipo}
${coresText}
${tecidoText}
${melhorarText}

DIRETRIZES DE COPY (obrigatórias):
- Tom: sofisticado, feminino, acolhedor. Como uma amiga de bom gosto indicando pessoalmente.
- NÃO use frases genéricas de IA como "perfeita para qualquer ocasião", "conforto incomparável", "peça essencial". Seja específica.
- Use detalhes reais e sensoriais: o toque do tecido, como o caimento valoriza, o que a cliente vai sentir ao vestir.
- SEO: o nome do produto + palavras-chave naturais (ex: "vestido midi feminino", "conjunto plus size evangélico", "roupa modesta cristã") devem aparecer nas primeiras 100 palavras, de forma orgânica.
- Estrutura: H2 com a promessa principal → parágrafo de abertura forte → 3 seções com subtítulo H3 → cada seção 2-3 frases densas.
- Não repita o nome do produto mais de 3 vezes no total.
- Escreva como se a cliente já estivesse vestindo a peça.

RETORNE APENAS o HTML abaixo, sem markdown, sem explicações, sem \`\`\`:

<h2>[Nome do produto] — [Promessa principal em até 8 palavras. Ex: "O Vestido que Faz Você Chegar e Ser Notada"]</h2>
<p>[Abertura: 3-5 frases. Apresente a peça de forma sensorial e emocional. Inclua palavras-chave de busca naturalmente. Diga para quem é ideal. Seja específica — mencione o tipo de ocasião, o tipo de silhueta que valoriza, o que tem de especial. Sem adjetivos vazios.]</p>

<div class="secao-foto">
<h3>[Subtítulo 1: foco em design/modelagem. Ex: "Corte que Valoriza Sem Apertar"]</h3>
<p>[2-3 frases sobre como a modelagem funciona. Mencione: onde ajusta, onde solta, que tipo de corpo valoriza, como o caimento se comporta ao sentar ou se movimentar. Detalhe técnico + benefício emocional.]</p>
</div>

<div class="secao-foto">
<h3>[Subtítulo 2: foco em tecido/qualidade. Ex: "Tecido que Você Sente ao Primeiro Toque"]</h3>
<p>[2-3 frases. Nome do tecido (se souber), textura, peso, se amassa ou não, respirabilidade, durabilidade. Como a cliente vai se sentir usando o dia todo. Compare com algo que ela conhece se possível.]</p>
</div>

<div class="secao-foto">
<h3>[Subtítulo 3: foco em versatilidade/estilo. Ex: "Do Culto ao Jantar — Sem Trocar de Roupa"]</h3>
<p>[2-3 frases. Diga 2-3 combinações específicas (ex: "com scarpin nude e brinco de argola dourada para uma reunião"). Mencione ocasiões reais da vida da cliente cristã: culto, almoço de família, trabalho, viagem, evento escolar dos filhos.]</p>
</div>`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const html = (response.content[0] as { text: string }).text.trim()
    res.status(200).json({ html })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao gerar descrição' })
  }
}

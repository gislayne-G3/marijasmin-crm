import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { pergunta, mes_ref, contexto } = req.body || {}

  if (!pergunta) {
    return res.status(400).json({ error: 'pergunta é obrigatória' })
  }

  try {
    const systemPrompt = `Você é o Agente Fiscal Comercial da Marijasmin, uma marca de moda feminina cristã e modesta do Ceará.

Seu papel: analisar dados comerciais e dar respostas estratégicas para a Diretora Comercial.

REGRAS:
- Sempre responda em português brasileiro
- Seja direto e prático — a diretora é ocupada
- Sempre inclua: 1) Análise do cenário 2) 3 ações concretas 3) Prazo sugerido para cada ação
- Use emojis moderadamente para destacar pontos
- Considere o contexto cristão e acolhedor da marca
- Foque em resultados mensuráveis
- Quando falar de vendedoras, seja respeitoso e construtivo
- Nunca sugira demissões — sugira treinamento, mentoria, redistribuição`

    const userMessage = `MÊS DE REFERÊNCIA: ${mes_ref || 'atual'}

DADOS ATUAIS:
${JSON.stringify(contexto, null, 2)}

PERGUNTA DA DIRETORA:
${pergunta}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const resposta = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n')

    return res.status(200).json({ ok: true, resposta })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro no agente fiscal'
    return res.status(500).json({ error: msg })
  }
}

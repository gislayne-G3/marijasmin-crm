import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDark } from '../hooks/useDark'
import {
  Bot, MessageSquare, Users, Repeat, ShoppingCart, DollarSign,
  TrendingUp, Activity, Clock, ArrowRight, Zap,
} from 'lucide-react'

/* ─── TYPES ─── */
interface PerfDia {
  id: string
  data_ref: string
  mensagens_enviadas: number
  mensagens_recebidas: number
  clientes_atendidos: number
  clientes_reativados: number
  conversas_transferidas_vendedora: number
  pedidos_gerados: number
  valor_pedidos_gerados: number
  custo_api_whatsapp: number
  custo_claude_tokens: number
  custo_claude_reais: number
  custo_total_reais: number
  taxa_conversao: number
}

interface ConversaRecente {
  id: number
  telefone: string
  cliente_nome: string | null
  mensagem: string | null
  direcao: string
  created_at: string
  resultado: string
}

interface ClienteReativado {
  cliente_id: number
  cliente_nome: string
  dias_inativo: number
  data_reativacao: string
  valor_pedido: number
}

/* ─── HELPERS ─── */
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function fmtHora(d: string) {
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/* ─── COMPONENT ─── */
export default function MariPerformance() {
  const dark = useDark()
  const [loading, setLoading] = useState(true)
  const [perfHoje, setPerfHoje] = useState<PerfDia | null>(null)
  const [perfMes, setPerfMes] = useState<PerfDia[]>([])
  const [conversasRecentes, setConversasRecentes] = useState<ConversaRecente[]>([])
  const [reativados, setReativados] = useState<ClienteReativado[]>([])
  const [secaoAtiva, setSecaoAtiva] = useState<'overview' | 'custos' | 'feed' | 'reativados'>('overview')

  // Stats calculados do mês
  const [statsMes, setStatsMes] = useState({
    mensagens_enviadas: 0,
    mensagens_recebidas: 0,
    clientes_atendidos: 0,
    clientes_reativados: 0,
    pedidos_gerados: 0,
    valor_pedidos: 0,
    custo_whatsapp: 0,
    custo_claude: 0,
    custo_total: 0,
    taxa_conversao: 0,
  })

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)

    const hoje = new Date().toISOString().slice(0, 10)
    const mesAtual = new Date().toISOString().slice(0, 7)
    const inicioMes = `${mesAtual}-01`

    // 1. Performance de hoje
    const { data: perfHojeData } = await supabase
      .from('mari_performance')
      .select('*')
      .eq('data_ref', hoje)
      .maybeSingle()
    setPerfHoje(perfHojeData as PerfDia | null)

    // 2. Performance do mês
    const { data: perfMesData } = await supabase
      .from('mari_performance')
      .select('*')
      .gte('data_ref', inicioMes)
      .order('data_ref', { ascending: false })
    setPerfMes((perfMesData || []) as PerfDia[])

    // Calcular totais do mês
    const mes = perfMesData || []
    setStatsMes({
      mensagens_enviadas: mes.reduce((s, d) => s + (d.mensagens_enviadas || 0), 0),
      mensagens_recebidas: mes.reduce((s, d) => s + (d.mensagens_recebidas || 0), 0),
      clientes_atendidos: mes.reduce((s, d) => s + (d.clientes_atendidos || 0), 0),
      clientes_reativados: mes.reduce((s, d) => s + (d.clientes_reativados || 0), 0),
      pedidos_gerados: mes.reduce((s, d) => s + (d.pedidos_gerados || 0), 0),
      valor_pedidos: mes.reduce((s, d) => s + (Number(d.valor_pedidos_gerados) || 0), 0),
      custo_whatsapp: mes.reduce((s, d) => s + (Number(d.custo_api_whatsapp) || 0), 0),
      custo_claude: mes.reduce((s, d) => s + (Number(d.custo_claude_reais) || 0), 0),
      custo_total: mes.reduce((s, d) => s + (Number(d.custo_total_reais) || 0), 0),
      taxa_conversao: mes.length > 0
        ? mes.reduce((s, d) => s + (Number(d.taxa_conversao) || 0), 0) / mes.length
        : 0,
    })

    // 3. Últimas conversas da Mari (feed ao vivo)
    const { data: convRecentes } = await supabase
      .from('conversas')
      .select('id, telefone, cliente_id, mensagem, direcao, atendente, created_at')
      .eq('atendente', 'mari')
      .order('created_at', { ascending: false })
      .limit(30)

    // Enriquecer com nomes de clientes
    const cIds = [...new Set((convRecentes || []).filter(c => c.cliente_id).map(c => c.cliente_id!))]
    let nomeMap: Record<number, string> = {}
    if (cIds.length > 0) {
      const { data: nomes } = await supabase.from('clientes').select('id, nome').in('id', cIds.slice(0, 200))
      for (const n of nomes || []) nomeMap[n.id] = n.nome
    }

    setConversasRecentes((convRecentes || []).map(c => ({
      id: c.id,
      telefone: c.telefone,
      cliente_nome: c.cliente_id ? (nomeMap[c.cliente_id] || c.telefone) : c.telefone,
      mensagem: c.mensagem,
      direcao: c.direcao,
      created_at: c.created_at,
      resultado: c.direcao === 'saida' ? 'enviou' : 'recebeu',
    })))

    // 4. Clientes reativados (inativos que compraram após contato da Mari)
    const { data: reativadosData } = await supabase
      .from('conversas')
      .select('cliente_id, created_at')
      .eq('atendente', 'mari')
      .eq('cliente_reativado', true)
      .gte('created_at', inicioMes)
      .order('created_at', { ascending: false })
      .limit(20)

    const reatList: ClienteReativado[] = []
    for (const r of reativadosData || []) {
      if (!r.cliente_id) continue
      const nome = nomeMap[r.cliente_id] || `Cliente #${r.cliente_id}`

      // Buscar pedido gerado após reativação
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('valor_total, data_pedido')
        .eq('cliente_id', r.cliente_id)
        .gte('data_pedido', r.created_at.slice(0, 10))
        .order('data_pedido', { ascending: true })
        .limit(1)
        .maybeSingle()

      reatList.push({
        cliente_id: r.cliente_id,
        cliente_nome: nome,
        dias_inativo: 0,
        data_reativacao: r.created_at,
        valor_pedido: pedido ? Number(pedido.valor_total) : 0,
      })
    }
    setReativados(reatList)

    setLoading(false)
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando Performance da Mari...</div>
  }

  const roi = statsMes.custo_total > 0
    ? Math.round((statsMes.valor_pedidos / statsMes.custo_total) * 100)
    : 0

  // ─── RENDER ───
  return (
    <div style={{ padding: '28px 36px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--vinho), #c44d8a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Performance da Mari SDR</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
              Agente de atendimento e vendas via WhatsApp · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {([
          { key: 'overview', label: '📊 Overview' },
          { key: 'custos', label: '💰 Custo da Mari' },
          { key: 'feed', label: '💬 Feed ao Vivo' },
          { key: 'reativados', label: '🔄 Reativados' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSecaoAtiva(key)}
            style={{
              padding: '8px 16px', borderRadius: 100, border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Montserrat',
              background: secaoAtiva === key ? 'var(--vinho)' : 'var(--surface)',
              color: secaoAtiva === key ? 'white' : 'var(--text)',
              boxShadow: secaoAtiva === key ? '0 2px 8px rgba(142,39,83,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════ OVERVIEW ══════ */}
      {secaoAtiva === 'overview' && (
        <>
          {/* Cards de hoje */}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hoje</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Msgs Enviadas', valor: perfHoje?.mensagens_enviadas || 0, icon: MessageSquare, color: '#7c3aed' },
              { label: 'Msgs Recebidas', valor: perfHoje?.mensagens_recebidas || 0, icon: MessageSquare, color: '#0e7490' },
              { label: 'Clientes Atendidos', valor: perfHoje?.clientes_atendidos || 0, icon: Users, color: 'var(--azul)' },
              { label: 'Reativados', valor: perfHoje?.clientes_reativados || 0, icon: Repeat, color: '#16a34a' },
              { label: 'Pedidos Gerados', valor: perfHoje?.pedidos_gerados || 0, icon: ShoppingCart, color: 'var(--vinho)' },
              { label: 'Valor Gerado', valor: fmtMoeda(Number(perfHoje?.valor_pedidos_gerados || 0)), icon: DollarSign, color: '#d97706', isMoeda: true },
            ].map(({ label, valor, icon: Icon, color }) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={color} />
                  </div>
                </div>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--azul)', margin: '0 0 2px' }}>
                  {typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Cards do mês */}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Acumulado do Mês</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Msgs Enviadas', valor: statsMes.mensagens_enviadas },
              { label: 'Msgs Recebidas', valor: statsMes.mensagens_recebidas },
              { label: 'Clientes Atendidos', valor: statsMes.clientes_atendidos },
              { label: 'Reativados', valor: statsMes.clientes_reativados },
              { label: 'Pedidos Gerados', valor: statsMes.pedidos_gerados },
              { label: 'Receita Gerada', valor: fmtMoeda(statsMes.valor_pedidos), isMoeda: true },
            ].map(({ label, valor }) => (
              <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--azul)', margin: '0 0 2px' }}>
                  {typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Gráfico de atividade (barras simples por dia) */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Activity size={16} color="var(--vinho)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>Atividade por Dia</span>
            </div>

            {perfMes.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>
                Sem dados de performance registrados ainda
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                {[...perfMes].reverse().map(d => {
                  const maxMsgs = Math.max(...perfMes.map(p => p.mensagens_enviadas + p.mensagens_recebidas), 1)
                  const totalMsgs = d.mensagens_enviadas + d.mensagens_recebidas
                  const altura = (totalMsgs / maxMsgs) * 100
                  return (
                    <div key={d.data_ref} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{totalMsgs}</span>
                      <div style={{
                        width: '100%', maxWidth: 30, borderRadius: '4px 4px 0 0',
                        height: `${Math.max(altura, 4)}%`,
                        background: d.data_ref === new Date().toISOString().slice(0, 10)
                          ? 'var(--vinho)'
                          : 'var(--azul)',
                        opacity: d.data_ref === new Date().toISOString().slice(0, 10) ? 1 : 0.6,
                        transition: 'height 0.3s',
                      }} />
                      <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                        {new Date(d.data_ref).getDate()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════ CUSTOS ══════ */}
      {secaoAtiva === 'custos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Custos */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <DollarSign size={18} color="#dc2626" />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Custo da Mari (o "salário" dela)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Custo API WhatsApp (Meta)</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Hoje: {fmtMoeda(Number(perfHoje?.custo_api_whatsapp || 0))}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '2px 0 0' }}>Mês: {fmtMoeda(statsMes.custo_whatsapp)}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Custo Claude Haiku (tokens)</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Hoje: {fmtMoeda(Number(perfHoje?.custo_claude_reais || 0))}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '2px 0 0' }}>Mês: {fmtMoeda(statsMes.custo_claude)}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: dark ? 'rgba(220,38,38,0.10)' : '#fef2f2', borderRadius: 10, padding: '14px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>CUSTO TOTAL DO MÊS</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{fmtMoeda(statsMes.custo_total)}</span>
              </div>
            </div>
          </div>

          {/* ROI */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <TrendingUp size={18} color="#16a34a" />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Retorno sobre Investimento</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Receita Gerada</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>{fmtMoeda(statsMes.valor_pedidos)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>Custo Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{fmtMoeda(statsMes.custo_total)}</span>
              </div>

              <div style={{
                background: roi > 100 ? (dark ? 'rgba(22,163,74,0.12)' : '#dcfce7') : (dark ? 'rgba(217,119,6,0.12)' : '#fef9c3'), borderRadius: 10, padding: '16px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase' }}>ROI</p>
                <p style={{ fontSize: 32, fontWeight: 800, color: roi > 100 ? '#16a34a' : '#d97706', margin: 0 }}>
                  {roi > 0 ? `${roi}%` : '—'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>receita ÷ custo</p>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 12, color: 'var(--text)', margin: 0 }}>
                  <Zap size={12} color="#d97706" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Atendente humana custaria ~<strong>R$ 2.500/mês</strong>.
                  Mari custou <strong>{fmtMoeda(statsMes.custo_total)}</strong>.
                </p>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 12, color: 'var(--text)', margin: 0 }}>
                  📊 Taxa de conversão média: <strong>{statsMes.taxa_conversao.toFixed(1)}%</strong> (atendimentos → pedidos)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ FEED AO VIVO ══════ */}
      {secaoAtiva === 'feed' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <MessageSquare size={18} color="var(--vinho)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Feed ao Vivo — Últimas Interações da Mari</span>
          </div>

          {conversasRecentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Bot size={36} color="var(--text-light)" />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>Nenhuma interação da Mari registrada</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {conversasRecentes.map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderBottom: i < conversasRecentes.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {/* Indicador direção */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: c.direcao === 'saida' ? '#7c3aed' : '#16a34a',
                  }} />

                  {/* Conteúdo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.cliente_nome}</span>
                      <ArrowRight size={10} color="var(--text-muted)" />
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: c.direcao === 'saida' ? '#7c3aed' : '#16a34a',
                      }}>
                        {c.direcao === 'saida' ? 'Mari enviou' : 'Cliente respondeu'}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {c.mensagem || '(sem conteúdo)'}
                    </p>
                  </div>

                  {/* Horário */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                      <Clock size={9} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                      {fmtHora(c.created_at)}
                    </p>
                    <p style={{ fontSize: 9, color: 'var(--text-light)', margin: '1px 0 0' }}>
                      {fmtData(c.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ REATIVADOS ══════ */}
      {secaoAtiva === 'reativados' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Repeat size={18} color="#16a34a" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Clientes Reativados pela Mari</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ({reativados.length} reativados · {fmtMoeda(reativados.reduce((s, r) => s + r.valor_pedido, 0))} recuperados)
            </span>
          </div>

          {reativados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Repeat size={36} color="var(--text-light)" />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>Nenhum cliente reativado registrado este mês</p>
              <p style={{ fontSize: 11, color: 'var(--text-light)' }}>
                Dados populados automaticamente quando a Mari contata inativos e eles compram
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 120px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', gap: 8 }}>
                <span>Cliente</span><span>Data Reativação</span><span>Valor Pedido</span>
              </div>
              {reativados.map((r, i) => (
                <div key={`${r.cliente_id}-${i}`} style={{
                  display: 'grid', gridTemplateColumns: '2fr 120px 120px', padding: '10px 0',
                  borderBottom: i < reativados.length - 1 ? '1px solid var(--border)' : 'none',
                  gap: 8, alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.cliente_nome}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtData(r.data_reativacao)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: r.valor_pedido > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                    {r.valor_pedido > 0 ? fmtMoeda(r.valor_pedido) : 'Pendente'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

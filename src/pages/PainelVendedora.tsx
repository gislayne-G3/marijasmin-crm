import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Target, DollarSign, Calendar,
  Phone, Search, Clock, Star,
} from 'lucide-react'
import { useDark, useStatusCores } from '../hooks/useDark'

/* ─── TYPES ─── */
interface MetaVendedora {
  id: string
  meta_mensal: number
  meta_semanal: number
  meta_diaria: number
  ticket_medio_meta: number
  realizado_mensal: number
  realizado_semana: number
  realizado_hoje: number
  percentual_mensal: number
  comissao_calculada: number
  mes_ref: string
}

interface Comissao {
  mes_ref: string
  total_vendas_bruto: number
  total_frete: number
  total_vendas_liquido: number
  percentual_comissao: number
  valor_comissao: number
  status: string
}

interface ClienteAcao {
  id: number
  nome: string
  telefone: string | null
  status: string
  ultimo_pedido: string | null
  dias_sem_compra: number
  tipo_acao: 'inativo' | 'esfriando' | 'aniversario' | 'sem_resposta'
}

interface ClienteTabela {
  id: number
  nome: string
  telefone: string | null
  status: string
  ultimo_pedido: string | null
  total_gasto: number
  total_pedidos: number
}

interface PedidoVendedora {
  id: number
  tiny_id: number | null
  data_pedido: string
  valor_total: number
  status: string
  cliente_nome: string | null
}

/* ─── HELPERS ─── */
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
function diasEntre(d1: string, d2: Date) {
  return Math.floor((d2.getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24))
}

/* ─── COMPONENT ─── */
export default function PainelVendedora() {
  const dark = useDark()
  const _statusCores = useStatusCores()
  const [_vendedoraId, setVendedoraId] = useState<number | null>(null)
  const [vendedoraNome, setVendedoraNome] = useState('')
  const [meta, setMeta] = useState<MetaVendedora | null>(null)
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [acoes, setAcoes] = useState<ClienteAcao[]>([])
  const [clientes, setClientes] = useState<ClienteTabela[]>([])
  const [pedidos, setPedidos] = useState<PedidoVendedora[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCli, setSearchCli] = useState('')
  const [filtroCli, setFiltroCli] = useState<'todos' | 'ativo' | 'esfriando' | 'inativo'>('todos')
  const [filtroPed, setFiltroPed] = useState<'todos' | 'Aprovado' | 'Faturado' | 'Cancelado'>('todos')
  const [secaoAtiva, setSecaoAtiva] = useState<'metas' | 'comissao' | 'acoes' | 'clientes' | 'pedidos'>('metas')

  useEffect(() => { identificarVendedora() }, [])

  async function identificarVendedora() {
    setLoading(true)

    // Buscar user autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Buscar vendedora pelo auth_user_id ou pelo email no profile
    const { data: vendedora } = await supabase
      .from('vendedoras')
      .select('id, nome')
      .eq('tipo', 'vendedora_humana')
      .eq('ativa', true)

    if (!vendedora || vendedora.length === 0) { setLoading(false); return }

    // Tentar match por auth_user_id primeiro
    let v = vendedora.find((_vd: { id: number }) => {
      return false // auth_user_id precisa ser configurado
    })

    // Fallback: usar a primeira vendedora (para demo/teste)
    // Em produção: match via auth_user_id configurado na Etapa 7
    if (!v) v = vendedora[0]

    setVendedoraId(v.id)
    setVendedoraNome(v.nome)

    await carregarDados(v.id)
    setLoading(false)
  }

  async function carregarDados(vId: number) {
    const mesAtual = new Date().toISOString().slice(0, 7) // '2026-03'
    const hoje = new Date()

    // 1. Meta ativa do mês
    const { data: metaAtiva } = await supabase
      .from('metas_mensais')
      .select('id')
      .eq('mes_ref', mesAtual)
      .eq('status', 'ativa')
      .maybeSingle()

    if (metaAtiva) {
      const { data: metaV } = await supabase
        .from('metas_vendedoras')
        .select('*')
        .eq('meta_mensal_id', metaAtiva.id)
        .eq('vendedora_id', vId)
        .maybeSingle()

      if (metaV) {
        // Calcular realizado do mês atual
        const inicioMes = `${mesAtual}-01`
        const { data: pedsMes } = await supabase
          .from('pedidos')
          .select('valor_total, data_pedido')
          .eq('vendedora_id', vId)
          .gte('data_pedido', inicioMes)

        const realizadoMensal = (pedsMes || []).reduce((s, p) => s + (Number(p.valor_total) || 0), 0)

        // Realizado da semana (seg-dom)
        const diaSemana = hoje.getDay()
        const inicioSemana = new Date(hoje)
        inicioSemana.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))
        const realizadoSemana = (pedsMes || []).filter(p =>
          new Date(p.data_pedido) >= inicioSemana
        ).reduce((s, p) => s + (Number(p.valor_total) || 0), 0)

        // Realizado de hoje
        const hojeStr = hoje.toISOString().slice(0, 10)
        const realizadoHoje = (pedsMes || []).filter(p =>
          p.data_pedido === hojeStr
        ).reduce((s, p) => s + (Number(p.valor_total) || 0), 0)

        const percentual = Number(metaV.meta_mensal) > 0
          ? Math.round((realizadoMensal / Number(metaV.meta_mensal)) * 10000) / 100
          : 0

        setMeta({
          ...metaV,
          realizado_mensal: realizadoMensal,
          realizado_semana: realizadoSemana,
          realizado_hoje: realizadoHoje,
          percentual_mensal: percentual,
        } as MetaVendedora)
      }
    }

    // 2. Comissões (últimos 3 meses)
    const { data: comData } = await supabase
      .from('comissoes')
      .select('mes_ref, total_vendas_bruto, total_frete, total_vendas_liquido, percentual_comissao, valor_comissao, status')
      .eq('vendedora_id', vId)
      .order('mes_ref', { ascending: false })
      .limit(4)
    setComissoes((comData || []) as Comissao[])

    // 3. Clientes da vendedora (via pedidos)
    const { data: pedidosCli } = await supabase
      .from('pedidos')
      .select('cliente_id, valor_total, data_pedido')
      .eq('vendedora_id', vId)
      .order('data_pedido', { ascending: false })

    const clienteIds = [...new Set((pedidosCli || []).filter(p => p.cliente_id).map(p => p.cliente_id!))]

    if (clienteIds.length > 0) {
      const { data: cliData } = await supabase
        .from('clientes')
        .select('id, nome, telefone, status')
        .in('id', clienteIds.slice(0, 200))

      const clientesMap: Record<number, ClienteTabela> = {}
      for (const c of cliData || []) {
        const pedsCli = (pedidosCli || []).filter(p => p.cliente_id === c.id)
        const totalGasto = pedsCli.reduce((s, p) => s + (Number(p.valor_total) || 0), 0)
        clientesMap[c.id] = {
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          status: c.status || 'ativo',
          ultimo_pedido: pedsCli[0]?.data_pedido || null,
          total_gasto: totalGasto,
          total_pedidos: pedsCli.length,
        }
      }
      setClientes(Object.values(clientesMap).sort((a, b) => b.total_gasto - a.total_gasto))

      // 4. Ações de hoje: clientes que precisam de contato
      const acoesLista: ClienteAcao[] = []
      for (const c of Object.values(clientesMap)) {
        if (!c.ultimo_pedido) continue
        const dias = diasEntre(c.ultimo_pedido, hoje)

        if (dias >= 60) {
          acoesLista.push({ ...c, dias_sem_compra: dias, tipo_acao: 'inativo' })
        } else if (dias >= 30) {
          acoesLista.push({ ...c, dias_sem_compra: dias, tipo_acao: 'esfriando' })
        }
      }
      // Ordenar por urgência
      acoesLista.sort((a, b) => {
        const prioridade = { inativo: 0, sem_resposta: 1, esfriando: 2, aniversario: 3 }
        return prioridade[a.tipo_acao] - prioridade[b.tipo_acao]
      })
      setAcoes(acoesLista.slice(0, 20))
    }

    // 5. Pedidos da vendedora
    const { data: pedsVendedora } = await supabase
      .from('pedidos')
      .select('id, tiny_id, data_pedido, valor_total, status, cliente_nome_tiny')
      .eq('vendedora_id', vId)
      .order('data_pedido', { ascending: false })
      .limit(100)

    setPedidos((pedsVendedora || []).map(p => ({
      ...p,
      cliente_nome: p.cliente_nome_tiny,
    })) as PedidoVendedora[])
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando painel...</p>
      </div>
    )
  }

  // Frase motivacional
  let fraseMotivacional = ''
  let fraseEmoji = '💪'
  if (meta) {
    const pct = meta.percentual_mensal
    if (pct >= 100) { fraseMotivacional = 'META BATIDA! Glória a Deus! Você arrasou!'; fraseEmoji = '⭐' }
    else if (pct >= 70) { fraseMotivacional = 'Incrível! Você está quase lá!'; fraseEmoji = '🎉' }
    else if (pct >= 30) { fraseMotivacional = 'Ótimo ritmo! Continue assim e vai bater a meta!'; fraseEmoji = '🚀' }
    else { fraseMotivacional = 'Vamos lá! Cada cliente é uma oportunidade. Você consegue!'; fraseEmoji = '💪' }
  }

  const clientesFiltrados = clientes.filter(c => {
    if (filtroCli !== 'todos' && c.status !== filtroCli) return false
    if (searchCli) {
      const s = searchCli.toLowerCase()
      return c.nome.toLowerCase().includes(s) || (c.telefone || '').includes(s)
    }
    return true
  })

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroPed !== 'todos' && p.status !== filtroPed) return false
    return true
  })

  const totalPedidosFiltrados = pedidosFiltrados.reduce((s, p) => s + (Number(p.valor_total) || 0), 0)

  const corProgresso = (pct: number) => pct >= 100 ? '#16a34a' : pct >= 70 ? '#0e7490' : pct >= 30 ? '#d97706' : '#dc2626'

  // ─── RENDER ───
  return (
    <div style={{ padding: '28px 36px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header personalizado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>
          {saudacao()}, {vendedoraNome.split(' ')[0]}! ☀️
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
          Que Deus abençoe seu dia de vendas · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Nav de seções */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { key: 'metas', label: '🎯 Metas', icon: Target },
          { key: 'comissao', label: '💰 Comissão', icon: DollarSign },
          { key: 'acoes', label: '📋 Ações de Hoje', icon: Calendar },
          { key: 'clientes', label: '👥 Meus Clientes', icon: Search },
          { key: 'pedidos', label: '🛒 Meus Pedidos', icon: Clock },
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

      {/* ══════ SEÇÃO METAS ══════ */}
      {secaoAtiva === 'metas' && (
        <>
          {!meta ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px', textAlign: 'center' }}>
              <Target size={36} color="var(--text-light)" />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginTop: 12 }}>
                Nenhuma meta definida para este mês
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>A Direção Comercial precisa aprovar as metas do mês</p>
            </div>
          ) : (
            <>
              {/* Cards de meta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
                {/* Meta do mês */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase' }}>Meta do Mês</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul)', margin: '0 0 6px' }}>
                    {fmtMoeda(meta.realizado_mensal)}
                  </p>
                  <div style={{ background: 'var(--bg)', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      height: '100%', borderRadius: 100,
                      width: `${Math.min(meta.percentual_mensal, 100)}%`,
                      background: `linear-gradient(90deg, var(--vinho), ${corProgresso(meta.percentual_mensal)})`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    <strong style={{ color: corProgresso(meta.percentual_mensal) }}>{meta.percentual_mensal}%</strong> de {fmtMoeda(Number(meta.meta_mensal))}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Faltam {fmtMoeda(Math.max(0, Number(meta.meta_mensal) - meta.realizado_mensal))}
                  </p>
                </div>

                {/* Meta da semana */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase' }}>Meta da Semana</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul)', margin: '0 0 6px' }}>
                    {fmtMoeda(meta.realizado_semana)}
                  </p>
                  {(() => {
                    const pctSemana = Number(meta.meta_semanal) > 0
                      ? Math.round((meta.realizado_semana / Number(meta.meta_semanal)) * 100)
                      : 0
                    return (
                      <>
                        <div style={{ background: 'var(--bg)', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', borderRadius: 100, width: `${Math.min(pctSemana, 100)}%`, background: 'var(--azul)', transition: 'width 0.5s' }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                          <strong>{pctSemana}%</strong> de {fmtMoeda(Number(meta.meta_semanal))}
                        </p>
                      </>
                    )
                  })()}
                </div>

                {/* Meta de hoje */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase' }}>Meta de Hoje</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul)', margin: '0 0 6px' }}>
                    {fmtMoeda(meta.realizado_hoje)}
                  </p>
                  {(() => {
                    const pctHoje = Number(meta.meta_diaria) > 0
                      ? Math.round((meta.realizado_hoje / Number(meta.meta_diaria)) * 100)
                      : 0
                    return (
                      <>
                        <div style={{ background: 'var(--bg)', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', borderRadius: 100, width: `${Math.min(pctHoje, 100)}%`, background: '#7c3aed', transition: 'width 0.5s' }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                          Meta: {fmtMoeda(Number(meta.meta_diaria))}
                        </p>
                      </>
                    )
                  })()}
                </div>

                {/* Ticket médio */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase' }}>Ticket Médio</p>
                  {(() => {
                    const pedsMes = pedidos.filter(p => p.data_pedido >= new Date().toISOString().slice(0, 7) + '-01')
                    const ticketAtual = pedsMes.length > 0
                      ? pedsMes.reduce((s, p) => s + Number(p.valor_total), 0) / pedsMes.length
                      : 0
                    return (
                      <>
                        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul)', margin: '0 0 6px' }}>
                          {fmtMoeda(ticketAtual)}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                          Meta: {fmtMoeda(Number(meta.ticket_medio_meta))}
                        </p>
                        <p style={{ fontSize: 10, color: ticketAtual >= Number(meta.ticket_medio_meta) ? '#16a34a' : '#d97706', fontWeight: 600, margin: '4px 0 0' }}>
                          {ticketAtual >= Number(meta.ticket_medio_meta) ? '✅ Acima da meta' : '📈 Tente oferecer combos e kits'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Frase motivacional */}
              <div style={{
                background: meta.percentual_mensal >= 100
                  ? (dark ? 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(253,230,138,0.15))' : 'linear-gradient(135deg, #fef9c3, #fde68a)')
                  : 'var(--surface)',
                border: `1px solid ${meta.percentual_mensal >= 100 ? (dark ? 'rgba(253,224,71,0.3)' : '#fde047') : 'var(--border)'}`,
                borderRadius: 12, padding: '14px 18px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--azul)', margin: 0 }}>
                  {fraseEmoji} {fraseMotivacional}
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════ SEÇÃO COMISSÃO ══════ */}
      {secaoAtiva === 'comissao' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <DollarSign size={18} color="var(--vinho)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Minha Comissão</span>
          </div>

          {comissoes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
              Nenhuma comissão calculada ainda
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {comissoes.map((c, i) => (
                <div key={c.mes_ref} style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr 1fr 100px',
                  padding: '14px 0', gap: 12, alignItems: 'center',
                  borderBottom: i < comissoes.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>{c.mes_ref}</span>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Vendas (bruto)</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{fmtMoeda(Number(c.total_vendas_bruto))}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Frete</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: '2px 0 0' }}>-{fmtMoeda(Number(c.total_frete))}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Líquido</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{fmtMoeda(Number(c.total_vendas_liquido))}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Comissão ({c.percentual_comissao}%)</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', margin: '2px 0 0' }}>{fmtMoeda(Number(c.valor_comissao))}</p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, textAlign: 'center',
                    background: c.status === 'pago'
                      ? (dark ? 'rgba(34,212,106,0.12)' : '#dcfce7')
                      : c.status === 'aprovado'
                      ? (dark ? 'rgba(37,99,235,0.12)' : '#dbeafe')
                      : (dark ? 'rgba(107,114,128,0.12)' : '#f3f4f6'),
                    color: c.status === 'pago'
                      ? (dark ? '#22d46a' : '#16a34a')
                      : c.status === 'aprovado'
                      ? (dark ? '#60a5fa' : '#2563eb')
                      : (dark ? '#9ca3af' : '#6b7280'),
                  }}>
                    {c.status?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ SEÇÃO AÇÕES DE HOJE ══════ */}
      {secaoAtiva === 'acoes' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Calendar size={18} color="var(--vinho)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Ações de Hoje</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{acoes.length} clientes para contatar</span>
          </div>

          {acoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Star size={32} color="#16a34a" />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginTop: 8 }}>Tudo em dia! Nenhuma ação pendente.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {acoes.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                  borderBottom: i < acoes.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {a.tipo_acao === 'inativo' ? '🔴' : a.tipo_acao === 'esfriando' ? '🟡' : a.tipo_acao === 'aniversario' ? '🎂' : '💬'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{a.nome}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {a.tipo_acao === 'inativo'
                        ? `Inativo há ${a.dias_sem_compra} dias — precisa ser reativado!`
                        : a.tipo_acao === 'esfriando'
                        ? `Esfriando — ${a.dias_sem_compra} dias sem comprar`
                        : a.tipo_acao === 'aniversario'
                        ? 'Aniversariante desta semana! 🎂'
                        : 'Sem resposta há 48h+'}
                    </p>
                  </div>
                  {a.telefone && (
                    <a
                      href={`https://wa.me/55${a.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                        borderRadius: 8, border: 'none', background: '#25D366', color: 'white',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
                        fontFamily: 'Montserrat', flexShrink: 0,
                      }}
                    >
                      <Phone size={12} /> WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ SEÇÃO MEUS CLIENTES ══════ */}
      {secaoAtiva === 'clientes' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Meus Clientes</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({clientes.length})</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['todos', 'ativo', 'esfriando', 'inativo'] as const).map(f => (
                <button key={f} onClick={() => setFiltroCli(f)}
                  style={{
                    padding: '4px 10px', borderRadius: 100, border: 'none', fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Montserrat',
                    background: filtroCli === f ? 'var(--vinho)' : 'var(--bg)',
                    color: filtroCli === f ? 'white' : 'var(--text-muted)',
                  }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Busca */}
          <div style={{ position: 'relative', marginBottom: 14, maxWidth: 300 }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={searchCli} onChange={e => setSearchCli(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, background: 'var(--bg)', boxSizing: 'border-box' }} />
          </div>

          {/* Tabela */}
          <div style={{ fontSize: 11 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 100px 80px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10, gap: 8 }}>
              <span>Nome</span><span>Status</span><span>Pedidos</span><span>Total Gasto</span><span>Última compra</span>
            </div>
            {clientesFiltrados.slice(0, 50).map((c, i) => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 100px 80px 100px 80px', padding: '10px 0',
                borderBottom: i < Math.min(clientesFiltrados.length, 50) - 1 ? '1px solid var(--border)' : 'none',
                gap: 8, alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{c.nome}</p>
                  {c.telefone && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '1px 0 0' }}>{c.telefone}</p>}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 100, textAlign: 'center',
                  background: c.status === 'ativo'
                    ? (dark ? 'rgba(34,212,106,0.12)' : '#dcfce7')
                    : c.status === 'esfriando'
                    ? (dark ? 'rgba(245,166,35,0.12)' : '#fef9c3')
                    : (dark ? 'rgba(240,72,72,0.12)' : '#fee2e2'),
                  color: c.status === 'ativo'
                    ? (dark ? '#22d46a' : '#16a34a')
                    : c.status === 'esfriando'
                    ? (dark ? '#f5a623' : '#d97706')
                    : (dark ? '#f04848' : '#dc2626'),
                }}>
                  {c.status}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text)', textAlign: 'center' }}>{c.total_pedidos}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--azul)' }}>{fmtMoeda(c.total_gasto)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.ultimo_pedido ? fmtData(c.ultimo_pedido) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ SEÇÃO MEUS PEDIDOS ══════ */}
      {secaoAtiva === 'pedidos' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Meus Pedidos</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({pedidos.length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['todos', 'Aprovado', 'Faturado', 'Cancelado'] as const).map(f => (
                  <button key={f} onClick={() => setFiltroPed(f)}
                    style={{
                      padding: '4px 10px', borderRadius: 100, border: 'none', fontSize: 10, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Montserrat',
                      background: filtroPed === f ? 'var(--vinho)' : 'var(--bg)',
                      color: filtroPed === f ? 'white' : 'var(--text-muted)',
                    }}>
                    {f === 'todos' ? 'Todos' : f}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>
                Total: {fmtMoeda(totalPedidosFiltrados)}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 11 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 100px 100px 80px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10, gap: 8 }}>
              <span>Nº</span><span>Cliente</span><span>Data</span><span>Valor</span><span>Status</span>
            </div>
            {pedidosFiltrados.slice(0, 50).map((p, i) => (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '80px 2fr 100px 100px 80px', padding: '10px 0',
                borderBottom: i < Math.min(pedidosFiltrados.length, 50) - 1 ? '1px solid var(--border)' : 'none',
                gap: 8, alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--azul)' }}>#{p.tiny_id || p.id}</span>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>{p.cliente_nome || '—'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtData(p.data_pedido)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>{fmtMoeda(Number(p.valor_total))}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: p.status === 'Aprovado'
                    ? (dark ? '#22d46a' : '#16a34a')
                    : p.status === 'Cancelado'
                    ? (dark ? '#f04848' : '#dc2626')
                    : (dark ? '#f5a623' : '#d97706'),
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { useDark } from '../hooks/useDark'
import {
  Target, BarChart3, ArrowUpRight, ArrowDownRight,
  Trophy, Send, Bot, RefreshCw, Check, Edit3,
  Repeat, Star,
} from 'lucide-react'

/* ─── TYPES ─── */
interface MetaGeral {
  id: string
  mes_ref: string
  meta_geral: number
  meta_minima: number
  meta_vendedoras: number
  meta_site: number
  meta_loja_fisica: number
  status: string
}

interface MetaVendedora {
  id: string
  vendedora_id: number
  vendedora_nome: string
  meta_mensal: number
  meta_semanal: number
  meta_diaria: number
  realizado_mensal: number
  percentual_mensal: number
  comissao_calculada: number
  status_aprovacao: string
  ticket_medio_real?: number
  qtd_pedidos?: number
}

interface CanalStats {
  canal: string
  total: number
  pedidos: number
  ticket_medio: number
}

interface TrocaStats {
  cliente_nome: string
  total_trocas: number
  valor_total: number
  motivos: string[]
}

interface ClienteVIP {
  id: number
  nome: string
  total_gasto: number
  total_pedidos: number
  ultimo_pedido: string | null
  dias_sem_compra: number
  vendedora_nome: string | null
}

/* ─── HELPERS ─── */
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ─── COMPONENT ─── */
export default function DirecaoComercial() {
  const dark = useDark()
  const [loading, setLoading] = useState(true)
  const [metaGeral, setMetaGeral] = useState<MetaGeral | null>(null)
  const [metasVendedoras, setMetasVendedoras] = useState<MetaVendedora[]>([])
  const [canais, setCanais] = useState<CanalStats[]>([])
  const [vips, setVips] = useState<ClienteVIP[]>([])
  const [trocas, setTrocas] = useState<TrocaStats[]>([])
  const [realizadoGeral, setRealizadoGeral] = useState(0)
  const [realizadoSite, setRealizadoSite] = useState(0)
  const [realizadoLoja, setRealizadoLoja] = useState(0)
  const [secaoAtiva, setSecaoAtiva] = useState<'metas' | 'ranking' | 'canais' | 'trocas' | 'vips' | 'agente'>('metas')

  // Form nova meta
  const [showFormMeta, setShowFormMeta] = useState(false)
  const [novaMetaGeral, setNovaMetaGeral] = useState('500000')
  const [novaMetaMinima, setNovaMetaMinima] = useState('200000')
  const [distribuindo, setDistribuindo] = useState(false)
  const [metasPendentes, setMetasPendentes] = useState<MetaVendedora[]>([])
  const [metaPendenteId, setMetaPendenteId] = useState<string | null>(null)
  const [editandoMeta, setEditandoMeta] = useState<string | null>(null)
  const [editValor, setEditValor] = useState('')

  // Agente Fiscal
  const [perguntaAgente, setPerguntaAgente] = useState('')
  const [respostaAgente, setRespostaAgente] = useState('')
  const [agenteLoading, setAgenteLoading] = useState(false)

  const mesAtual = new Date().toISOString().slice(0, 7)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)

    const inicioMes = `${mesAtual}-01`

    // 1. Meta ativa
    const { data: meta } = await supabase
      .from('metas_mensais')
      .select('*')
      .eq('mes_ref', mesAtual)
      .eq('status', 'ativa')
      .maybeSingle()

    if (meta) {
      setMetaGeral(meta as MetaGeral)

      // Metas vendedoras
      const { data: mvsData } = await supabase
        .from('metas_vendedoras')
        .select('*')
        .eq('meta_mensal_id', meta.id)
        .order('vendedora_nome')

      // Enriquecer com dados reais
      const mvs: MetaVendedora[] = []
      for (const mv of mvsData || []) {
        const { data: pedsV } = await supabase
          .from('pedidos')
          .select('valor_total')
          .eq('vendedora_id', mv.vendedora_id)
          .gte('data_pedido', inicioMes)

        const realizado = (pedsV || []).reduce((s, p) => s + (Number(p.valor_total) || 0), 0)
        const qtd = (pedsV || []).length
        const pct = Number(mv.meta_mensal) > 0 ? Math.round((realizado / Number(mv.meta_mensal)) * 10000) / 100 : 0

        mvs.push({
          ...mv,
          realizado_mensal: realizado,
          percentual_mensal: pct,
          ticket_medio_real: qtd > 0 ? realizado / qtd : 0,
          qtd_pedidos: qtd,
        } as MetaVendedora)
      }

      // Ordenar por percentual descrescente (ranking)
      mvs.sort((a, b) => b.percentual_mensal - a.percentual_mensal)
      setMetasVendedoras(mvs)
    }

    // 2. Realizado geral do mês (todos os canais)
    const { data: todosP } = await supabase
      .from('pedidos')
      .select('valor_total, canal, vendedora_id')
      .gte('data_pedido', inicioMes)

    const total = (todosP || []).reduce((s, p) => s + (Number(p.valor_total) || 0), 0)
    setRealizadoGeral(total)

    // Por canal
    const canalMap: Record<string, { total: number; pedidos: number }> = {}
    for (const p of todosP || []) {
      const c = p.canal || 'whatsapp'
      if (!canalMap[c]) canalMap[c] = { total: 0, pedidos: 0 }
      canalMap[c].total += Number(p.valor_total) || 0
      canalMap[c].pedidos++
    }

    const canalStats: CanalStats[] = Object.entries(canalMap).map(([canal, stats]) => ({
      canal,
      total: Math.round(stats.total * 100) / 100,
      pedidos: stats.pedidos,
      ticket_medio: stats.pedidos > 0 ? Math.round((stats.total / stats.pedidos) * 100) / 100 : 0,
    })).sort((a, b) => b.total - a.total)
    setCanais(canalStats)

    setRealizadoSite(canalMap['site']?.total || 0 + (canalMap['wbuy']?.total || 0) + (canalMap['nuvemshop']?.total || 0))
    setRealizadoLoja(canalMap['loja_fisica']?.total || 0)

    // 3. Top 20 VIPs
    const { data: cliPedidos } = await supabase
      .from('pedidos')
      .select('cliente_id, valor_total, data_pedido, vendedor_nome')
      .order('data_pedido', { ascending: false })

    const cliMap: Record<number, { total: number; pedidos: number; ultimo: string; vendedora: string | null }> = {}
    for (const p of cliPedidos || []) {
      if (!p.cliente_id) continue
      if (!cliMap[p.cliente_id]) {
        cliMap[p.cliente_id] = { total: 0, pedidos: 0, ultimo: p.data_pedido, vendedora: p.vendedor_nome }
      }
      cliMap[p.cliente_id].total += Number(p.valor_total) || 0
      cliMap[p.cliente_id].pedidos++
    }

    const topIds = Object.entries(cliMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20)
      .map(([id]) => Number(id))

    if (topIds.length > 0) {
      const { data: cliNomes } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', topIds)

      const nomeMap: Record<number, string> = {}
      for (const c of cliNomes || []) nomeMap[c.id] = c.nome

      const vipList: ClienteVIP[] = topIds.map(id => ({
        id,
        nome: nomeMap[id] || `Cliente #${id}`,
        total_gasto: cliMap[id].total,
        total_pedidos: cliMap[id].pedidos,
        ultimo_pedido: cliMap[id].ultimo,
        dias_sem_compra: cliMap[id].ultimo
          ? Math.floor((Date.now() - new Date(cliMap[id].ultimo).getTime()) / (1000 * 60 * 60 * 24))
          : 999,
        vendedora_nome: cliMap[id].vendedora,
      }))
      setVips(vipList)
    }

    // 4. Trocas do mês
    const { data: trocasData } = await supabase
      .from('trocas_devolucoes')
      .select('cliente_nome, motivo, motivo_categoria, valor_estorno')
      .gte('data_solicitacao', inicioMes)

    const trocaMap: Record<string, TrocaStats> = {}
    for (const t of trocasData || []) {
      const nome = t.cliente_nome || 'Desconhecido'
      if (!trocaMap[nome]) trocaMap[nome] = { cliente_nome: nome, total_trocas: 0, valor_total: 0, motivos: [] }
      trocaMap[nome].total_trocas++
      trocaMap[nome].valor_total += Number(t.valor_estorno) || 0
      if (t.motivo_categoria && !trocaMap[nome].motivos.includes(t.motivo_categoria)) {
        trocaMap[nome].motivos.push(t.motivo_categoria)
      }
    }
    setTrocas(Object.values(trocaMap).sort((a, b) => b.total_trocas - a.total_trocas).slice(0, 10))

    setLoading(false)
  }

  // Distribuir metas
  async function distribuirMetas() {
    setDistribuindo(true)
    try {
      const res = await apiFetch('/api/crm-api', {
        method: 'POST',
        body: JSON.stringify({
          action: 'metas-distribuir',
          meta_geral: Number(novaMetaGeral),
          meta_minima: Number(novaMetaMinima),
          mes_ref: mesAtual,
        }),
      })
      setMetaPendenteId(res.meta_mensal_id)
      setMetasPendentes(res.metas_individuais || [])
    } catch {
      alert('Erro ao distribuir metas')
    } finally {
      setDistribuindo(false)
    }
  }

  // Aprovar metas
  async function aprovarMetas() {
    if (!metaPendenteId) return
    try {
      const ajustes = metasPendentes.map(m => ({
        vendedora_id: m.vendedora_id,
        meta_mensal: m.meta_mensal,
      }))
      await apiFetch('/api/crm-api', {
        method: 'POST',
        body: JSON.stringify({ action: 'metas-aprovar', meta_mensal_id: metaPendenteId, ajustes }),
      })
      setShowFormMeta(false)
      setMetasPendentes([])
      setMetaPendenteId(null)
      await carregarDados()
    } catch {
      alert('Erro ao aprovar metas')
    }
  }

  // Agente Fiscal
  async function perguntarAgente() {
    if (!perguntaAgente.trim()) return
    setAgenteLoading(true)
    setRespostaAgente('')
    try {
      const res = await apiFetch('/api/crm-api', {
        method: 'POST',
        body: JSON.stringify({
          action: 'agente-fiscal',
          pergunta: perguntaAgente,
          mes_ref: mesAtual,
          contexto: {
            meta_geral: metaGeral?.meta_geral,
            realizado_geral: realizadoGeral,
            ranking: metasVendedoras.map(v => ({
              nome: v.vendedora_nome,
              meta: Number(v.meta_mensal),
              realizado: v.realizado_mensal,
              percentual: v.percentual_mensal,
            })),
            canais,
            total_vips: vips.length,
            total_trocas: trocas.reduce((s, t) => s + t.total_trocas, 0),
          },
        }),
      })
      setRespostaAgente(res.resposta || 'Sem resposta do agente.')
    } catch {
      setRespostaAgente('Erro ao consultar o agente fiscal.')
    } finally {
      setAgenteLoading(false)
    }
  }

  const corProgresso = (pct: number) => pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando Direção Comercial...</div>
  }

  const pctGeral = metaGeral && Number(metaGeral.meta_geral) > 0
    ? Math.round((realizadoGeral / Number(metaGeral.meta_geral)) * 10000) / 100
    : 0

  // ─── RENDER ───
  return (
    <div style={{ padding: '28px 36px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Direção Comercial</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            Painel estratégico · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => carregarDados()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: 'var(--text)' }}>
            <RefreshCw size={12} /> Atualizar
          </button>
          <button onClick={() => setShowFormMeta(!showFormMeta)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--vinho)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: 'white' }}>
            <Target size={12} /> {metaGeral ? 'Redefinir Metas' : 'Definir Metas do Mês'}
          </button>
        </div>
      </div>

      {/* Nav de seções */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'metas', label: '🎯 Metas & Progresso' },
          { key: 'ranking', label: '🏆 Ranking' },
          { key: 'canais', label: '📊 Canais' },
          { key: 'trocas', label: '🔄 Trocas' },
          { key: 'vips', label: '⭐ VIPs' },
          { key: 'agente', label: '🤖 Agente Fiscal' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setSecaoAtiva(key)}
            style={{
              padding: '7px 14px', borderRadius: 100, border: 'none', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Montserrat',
              background: secaoAtiva === key ? 'var(--vinho)' : 'var(--surface)',
              color: secaoAtiva === key ? 'white' : 'var(--text)',
              boxShadow: secaoAtiva === key ? '0 2px 8px rgba(142,39,83,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════ FORM DEFINIR METAS ══════ */}
      {showFormMeta && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--vinho)', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)', margin: '0 0 16px' }}>Definir Meta do Mês ({mesAtual})</h3>

          {metasPendentes.length === 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Meta Máxima (R$)</label>
                  <input value={novaMetaGeral} onChange={e => setNovaMetaGeral(e.target.value)} type="number"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontWeight: 700, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Meta Mínima (R$)</label>
                  <input value={novaMetaMinima} onChange={e => setNovaMetaMinima(e.target.value)} type="number"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontWeight: 700, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  <strong>Distribuição:</strong> 40% Vendedoras ({fmtMoeda(Number(novaMetaGeral) * 0.4)}) · 30% Site ({fmtMoeda(Number(novaMetaGeral) * 0.3)}) · 30% Loja ({fmtMoeda(Number(novaMetaGeral) * 0.3)})
                </p>
              </div>
              <button onClick={distribuirMetas} disabled={distribuindo}
                style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: distribuindo ? (dark ? '#333' : '#ccc') : 'var(--azul)', color: 'white', fontSize: 13, fontWeight: 700, cursor: distribuindo ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat' }}>
                {distribuindo ? '⏳ Calculando...' : '🤖 Distribuir com IA'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Sugestão do agente baseada no histórico. Ajuste os valores se necessário:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 100px 100px 60px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', gap: 8 }}>
                  <span>Vendedora</span><span>Meta Sugerida</span><span>Histórico 3m</span><span>% da equipe</span><span></span>
                </div>
                {metasPendentes.map((m: any, i: number) => (
                  <div key={m.vendedora_id} style={{ display: 'grid', gridTemplateColumns: '2fr 120px 100px 100px 60px', padding: '10px 0', borderBottom: i < metasPendentes.length - 1 ? '1px solid var(--border)' : 'none', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{m.vendedora_nome}</span>
                    {editandoMeta === m.vendedora_id?.toString() ? (
                      <input value={editValor} onChange={e => setEditValor(e.target.value)} type="number" autoFocus
                        onBlur={() => {
                          setMetasPendentes(prev => prev.map((p: any) => p.vendedora_id === m.vendedora_id ? { ...p, meta_mensal: Number(editValor) } : p))
                          setEditandoMeta(null)
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--vinho)', borderRadius: 4, fontSize: 12, fontWeight: 700, boxSizing: 'border-box' }}
                      />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>{fmtMoeda(m.meta_mensal)}</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtMoeda(m.historico_3m || 0)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.percentual_equipe || 0}%</span>
                    <button onClick={() => { setEditandoMeta(m.vendedora_id?.toString()); setEditValor(m.meta_mensal?.toString()) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Edit3 size={13} color="var(--text-muted)" />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={aprovarMetas}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 20px', border: 'none', borderRadius: 8, background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat' }}>
                  <Check size={14} /> Aprovar e Publicar
                </button>
                <button onClick={() => { setMetasPendentes([]); setShowFormMeta(false) }}
                  style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat' }}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════ SEÇÃO METAS & PROGRESSO ══════ */}
      {secaoAtiva === 'metas' && (
        <>
          {/* Cards de progresso por canal */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {/* Geral */}
            <div style={{ background: 'linear-gradient(135deg, var(--vinho), #b33d6d)', borderRadius: 14, padding: '20px', color: 'white' }}>
              <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase' }}>Geral</p>
              <p style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>{fmtMoeda(realizadoGeral)}</p>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', borderRadius: 100, width: `${Math.min(pctGeral, 100)}%`, background: 'white', transition: 'width 0.5s' }} />
              </div>
              <p style={{ fontSize: 11, opacity: 0.9, margin: 0 }}>{pctGeral}% de {metaGeral ? fmtMoeda(Number(metaGeral.meta_geral)) : 'sem meta'}</p>
            </div>

            {/* Vendedoras */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase' }}>Vendedoras</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--azul)', margin: '0 0 8px' }}>
                {fmtMoeda(metasVendedoras.reduce((s, v) => s + v.realizado_mensal, 0))}
              </p>
              {metaGeral && (
                <>
                  <div style={{ background: 'var(--bg)', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', borderRadius: 100, width: `${Math.min(metasVendedoras.reduce((s, v) => s + v.realizado_mensal, 0) / Number(metaGeral.meta_vendedoras) * 100, 100)}%`, background: 'var(--azul)', transition: 'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>de {fmtMoeda(Number(metaGeral.meta_vendedoras))}</p>
                </>
              )}
            </div>

            {/* Site */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase' }}>Site / E-commerce</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', margin: '0 0 8px' }}>{fmtMoeda(realizadoSite)}</p>
              {metaGeral && (
                <>
                  <div style={{ background: 'var(--bg)', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', borderRadius: 100, width: `${Math.min(realizadoSite / Number(metaGeral.meta_site) * 100, 100)}%`, background: '#7c3aed', transition: 'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>de {fmtMoeda(Number(metaGeral.meta_site))}</p>
                </>
              )}
            </div>

            {/* Loja Física */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase' }}>Loja Física</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#6b7280', margin: '0 0 8px' }}>{fmtMoeda(realizadoLoja)}</p>
              {metaGeral && (
                <>
                  <div style={{ background: 'var(--bg)', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', borderRadius: 100, width: `${Math.min(realizadoLoja / Number(metaGeral.meta_loja_fisica) * 100, 100)}%`, background: '#6b7280', transition: 'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>de {fmtMoeda(Number(metaGeral.meta_loja_fisica))}</p>
                </>
              )}
            </div>
          </div>

          {/* Projeção */}
          {metaGeral && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
              {(() => {
                const diaAtual = new Date().getDate()
                const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                const projecao = diaAtual > 0 ? (realizadoGeral / diaAtual) * diasNoMes : 0
                const bateMeta = projecao >= Number(metaGeral.meta_geral)
                return (
                  <p style={{ fontSize: 12, color: 'var(--text)', margin: 0 }}>
                    {bateMeta ? <ArrowUpRight size={14} color="#16a34a" style={{ verticalAlign: 'middle' }} /> : <ArrowDownRight size={14} color="#dc2626" style={{ verticalAlign: 'middle' }} />}
                    {' '}Projeção do mês: <strong style={{ color: bateMeta ? '#16a34a' : '#dc2626' }}>{fmtMoeda(projecao)}</strong>
                    {' '}— {bateMeta ? 'No ritmo atual, a meta será batida!' : `Faltam ${fmtMoeda(Number(metaGeral.meta_geral) - projecao)} para a meta.`}
                  </p>
                )
              })()}
            </div>
          )}
        </>
      )}

      {/* ══════ SEÇÃO RANKING ══════ */}
      {secaoAtiva === 'ranking' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Trophy size={18} color="#d97706" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Ranking de Vendedoras</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 120px 120px 80px 100px 100px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', gap: 8 }}>
            <span>#</span><span>Vendedora</span><span>Realizado</span><span>Meta</span><span>%</span><span>Ticket Médio</span><span>Comissão</span>
          </div>

          {metasVendedoras.map((v, i) => (
            <div key={v.id} style={{
              display: 'grid', gridTemplateColumns: '40px 2fr 120px 120px 80px 100px 100px',
              padding: '12px 0', gap: 8, alignItems: 'center',
              borderBottom: i < metasVendedoras.length - 1 ? '1px solid var(--border)' : 'none',
              background: i === 0 ? (dark ? 'rgba(217,119,6,0.1)' : '#fffbeb') : 'transparent',
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? '#d97706' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'var(--text-muted)' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{v.vendedora_nome}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>{fmtMoeda(v.realizado_mensal)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtMoeda(Number(v.meta_mensal))}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: corProgresso(v.percentual_mensal) }}>{v.percentual_mensal}%</span>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{fmtMoeda(v.ticket_medio_real || 0)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{fmtMoeda(Number(v.comissao_calculada))}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══════ SEÇÃO CANAIS ══════ */}
      {secaoAtiva === 'canais' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart3 size={18} color="var(--vinho)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Análise de Canais</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {canais.map(c => {
              const maxVal = Math.max(...canais.map(x => x.total))
              const largura = maxVal > 0 ? (c.total / maxVal) * 100 : 0
              const canalLabel: Record<string, string> = { whatsapp: '💬 WhatsApp', site: '🌐 Site', loja_fisica: '🏪 Loja Física', wbuy: '🛒 WBuy', nuvemshop: '🛍️ Nuvemshop', troca: '🔄 Trocas' }
              return (
                <div key={c.canal}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{canalLabel[c.canal] || c.canal}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>{fmtMoeda(c.total)}</span>
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 6, height: 24, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', borderRadius: 6,
                      width: `${largura}%`,
                      background: c.canal === 'whatsapp' ? '#25D366' : c.canal === 'site' ? '#7c3aed' : c.canal === 'loja_fisica' ? '#6b7280' : 'var(--azul)',
                      transition: 'width 0.5s',
                    }} />
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)' }}>
                      {c.pedidos} pedidos · Ticket {fmtMoeda(c.ticket_medio)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════ SEÇÃO TROCAS ══════ */}
      {secaoAtiva === 'trocas' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Repeat size={18} color="#dc2626" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Trocas e Devoluções do Mês</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ({trocas.reduce((s, t) => s + t.total_trocas, 0)} trocas · {fmtMoeda(trocas.reduce((s, t) => s + t.valor_total, 0))} estornado)
            </span>
          </div>

          {trocas.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Nenhuma troca registrada este mês</p>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 2fr', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', gap: 8 }}>
                <span>Cliente</span><span>Trocas</span><span>Valor Estornado</span><span>Motivos</span>
              </div>
              {trocas.map((t, i) => (
                <div key={t.cliente_nome} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 2fr', padding: '10px 0', borderBottom: i < trocas.length - 1 ? '1px solid var(--border)' : 'none', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t.cliente_nome}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textAlign: 'center' }}>{t.total_trocas}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>{fmtMoeda(t.valor_total)}</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {t.motivos.map(m => (
                      <span key={m} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 100, background: dark ? 'rgba(220,38,38,0.15)' : '#fee2e2', color: '#dc2626' }}>{m}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ SEÇÃO VIPs ══════ */}
      {secaoAtiva === 'vips' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Star size={18} color="#d97706" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Top 20 Clientes VIP (por LTV)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 120px 80px 100px 100px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', gap: 8 }}>
            <span>#</span><span>Cliente</span><span>LTV</span><span>Pedidos</span><span>Último Pedido</span><span>Vendedora</span>
          </div>

          {vips.map((v, i) => (
            <div key={v.id} style={{
              display: 'grid', gridTemplateColumns: '40px 2fr 120px 80px 100px 100px',
              padding: '10px 0', gap: 8, alignItems: 'center',
              borderBottom: i < vips.length - 1 ? '1px solid var(--border)' : 'none',
              background: v.dias_sem_compra > 60 ? (dark ? 'rgba(220,38,38,0.08)' : '#fef2f2') : 'transparent',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}º</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{v.nome}</p>
                {v.dias_sem_compra > 60 && (
                  <span style={{ fontSize: 9, color: '#dc2626', fontWeight: 700 }}>⚠ {v.dias_sem_compra} dias sem comprar</span>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>{fmtMoeda(v.total_gasto)}</span>
              <span style={{ fontSize: 12, color: 'var(--text)', textAlign: 'center' }}>{v.total_pedidos}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.ultimo_pedido ? fmtData(v.ultimo_pedido) : '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.vendedora_nome || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══════ SEÇÃO AGENTE FISCAL ══════ */}
      {secaoAtiva === 'agente' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bot size={18} color="var(--vinho)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Agente Fiscal Comercial</span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Faça perguntas estratégicas sobre vendas, metas, equipe e performance. O agente analisa todos os dados em tempo real.
          </p>

          {/* Sugestões */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              'Quem está abaixo da meta e o que fazer?',
              'Qual canal mais cresce esse mês?',
              'Sugira pauta para reunião de equipe',
              'Como aumentar o ticket médio?',
              'Quais clientes VIP não compraram esse mês?',
            ].map(s => (
              <button key={s} onClick={() => setPerguntaAgente(s)}
                style={{
                  padding: '6px 12px', borderRadius: 100, border: '1px solid var(--border)',
                  background: 'var(--bg)', fontSize: 11, color: 'var(--text)', cursor: 'pointer', fontFamily: 'Montserrat',
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={perguntaAgente}
              onChange={e => setPerguntaAgente(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && perguntarAgente()}
              placeholder="Ex: Preciso bater R$500k — qual plano de ação?"
              style={{ flex: 1, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' }}
            />
            <button onClick={perguntarAgente} disabled={agenteLoading || !perguntaAgente.trim()}
              style={{
                padding: '12px 20px', border: 'none', borderRadius: 10,
                background: agenteLoading || !perguntaAgente.trim() ? (dark ? '#333' : '#ccc') : 'var(--vinho)',
                color: 'white', fontSize: 13, fontWeight: 700, cursor: agenteLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Send size={14} /> {agenteLoading ? 'Analisando...' : 'Perguntar'}
            </button>
          </div>

          {/* Resposta */}
          {respostaAgente && (
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Bot size={14} color="var(--vinho)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--vinho)' }}>Agente Fiscal</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {respostaAgente}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

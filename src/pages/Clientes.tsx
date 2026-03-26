import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDark } from '../hooks/useDark'
import { Search, Users, TrendingDown, Clock, XCircle, ChevronRight, X, ShoppingBag, Phone, Mail, Calendar, Tag, Filter } from 'lucide-react'

interface Cliente {
  id: number
  nome: string
  telefone: string
  email: string
  segmento: string
  status: 'ativo' | 'esfriando' | 'inativo' | 'perdido' | string
  data_ultima_compra: string | null
  total_gasto: number
  qtd_pedidos: number
  ticket_medio: number
  tags: string[] | null
  vendedora_nome: string | null
  cpf_cnpj: string | null
  data_nascimento: string | null
}

interface Pedido {
  id: number
  data_pedido: string
  valor_total: number
  status: string
  canal: string
  vendedor_nome: string | null
}

function getStatusConfig(dark: boolean) {
  return {
    ativo:     { label: 'Ativo',      color: dark ? '#22d46a' : '#16a34a', bg: dark ? 'rgba(34,212,106,0.12)' : '#dcfce7', icon: '🟢' },
    esfriando: { label: 'Esfriando',  color: dark ? '#f5a623' : '#d97706', bg: dark ? 'rgba(245,166,35,0.12)' : '#fef9c3', icon: '🟡' },
    inativo:   { label: 'Inativo',    color: dark ? '#6B6B8A' : '#6b7280', bg: dark ? 'rgba(107,107,138,0.12)' : '#f3f4f6', icon: '⚪' },
    perdido:   { label: 'Perdido',    color: dark ? '#f04848' : '#dc2626', bg: dark ? 'rgba(240,72,72,0.12)' : '#fee2e2', icon: '🔴' },
  }
}

function fmt(val: number) {
  return val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0'
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function Clientes() {
  const dark = useDark()
  const STATUS_CONFIG = getStatusConfig(dark)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroSegmento, setFiltroSegmento] = useState<string>('todos')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const [pedidosCliente, setPedidosCliente] = useState<Pedido[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(false)

  const POR_PAGINA = 50

  useEffect(() => {
    carregarClientes()
  }, [])

  async function carregarClientes() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, telefone, email, segmento, status, data_ultima_compra, total_gasto, qtd_pedidos, ticket_medio, tags, vendedora_nome, cpf_cnpj, data_nascimento')
      .order('data_ultima_compra', { ascending: false, nullsFirst: false })
    setClientes(data || [])
    setLoading(false)
  }

  async function abrirCliente(c: Cliente) {
    setSelecionado(c)
    setLoadingPedidos(true)
    const { data } = await supabase
      .from('pedidos')
      .select('id, data_pedido, valor_total, status, canal, vendedor_nome')
      .eq('cliente_id', c.id)
      .order('data_pedido', { ascending: false })
      .limit(20)
    setPedidosCliente(data || [])
    setLoadingPedidos(false)
  }

  // Filtros aplicados
  const filtrados = clientes.filter(c => {
    const matchSearch = !search || [c.nome, c.telefone, c.email].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus
    const matchSeg = filtroSegmento === 'todos' || c.segmento === filtroSegmento
    return matchSearch && matchStatus && matchSeg
  })

  // Stats
  const stats = {
    ativo:     clientes.filter(c => c.status === 'ativo').length,
    esfriando: clientes.filter(c => c.status === 'esfriando').length,
    inativo:   clientes.filter(c => c.status === 'inativo').length,
    perdido:   clientes.filter(c => c.status === 'perdido').length,
  }

  // Paginação
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const inicio = (paginaAtual - 1) * POR_PAGINA
  const paginados = filtrados.slice(inicio, inicio + POR_PAGINA)

  function mudarFiltro(tipo: string, val: string) {
    setPaginaAtual(1)
    if (tipo === 'status') setFiltroStatus(val)
    if (tipo === 'segmento') setFiltroSegmento(val)
    if (tipo === 'search') { setSearch(val); setPaginaAtual(1) }
  }

  const statCards = [
    { key: 'ativo',     label: 'Ativos',      valor: stats.ativo,     icon: Users,         color: dark ? '#22d46a' : '#16a34a' },
    { key: 'esfriando', label: 'Esfriando',   valor: stats.esfriando, icon: Clock,         color: dark ? '#f5a623' : '#d97706' },
    { key: 'inativo',   label: 'Inativos',    valor: stats.inativo,   icon: TrendingDown,  color: dark ? '#6B6B8A' : '#6b7280' },
    { key: 'perdido',   label: 'Perdidos',    valor: stats.perdido,   icon: XCircle,       color: dark ? '#f04848' : '#dc2626' },
  ]

  return (
    <div style={{ padding: '32px 40px', position: 'relative' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Clientes</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          {clientes.length.toLocaleString('pt-BR')} clientes cadastrados · Base completa do Tiny ERP
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map(({ key, label, valor, icon: Icon, color }) => (
          <div
            key={key}
            onClick={() => mudarFiltro('status', filtroStatus === key ? 'todos' : key)}
            style={{
              background: 'var(--surface)', border: `2px solid ${filtroStatus === key ? color : 'var(--border)'}`,
              borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={color} />
              </div>
              {filtroStatus === key && (
                <span style={{ fontSize: 10, background: color, color: 'white', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                  FILTRO ATIVO
                </span>
              )}
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>{valor.toLocaleString('pt-BR')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros e busca */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => mudarFiltro('search', e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              border: '1px solid var(--border)', borderRadius: 10,
              fontSize: 13, fontFamily: 'Montserrat', color: 'var(--text)',
              background: 'var(--surface)', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filtro Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} color="var(--text-muted)" />
          <select
            value={filtroStatus}
            onChange={e => mudarFiltro('status', e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, fontFamily: 'Montserrat', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="esfriando">Esfriando</option>
            <option value="inativo">Inativos</option>
            <option value="perdido">Perdidos</option>
          </select>
        </div>

        {/* Filtro Segmento */}
        <select
          value={filtroSegmento}
          onChange={e => mudarFiltro('segmento', e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, fontFamily: 'Montserrat', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
        >
          <option value="todos">Todos os segmentos</option>
          <option value="atacado">Atacado</option>
          <option value="varejo">Varejo</option>
          <option value="a definir">A definir</option>
        </select>

        {/* Contagem */}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {filtrados.length.toLocaleString('pt-BR')} resultado{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header da tabela */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 100px 110px 100px 110px 100px 36px',
          padding: '10px 20px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 0.5,
          gap: 8,
        }}>
          <span>Cliente</span>
          <span>Contato</span>
          <span>Status</span>
          <span>Última compra</span>
          <span style={{ textAlign: 'right' }}>Pedidos</span>
          <span style={{ textAlign: 'right' }}>Total gasto</span>
          <span style={{ textAlign: 'right' }}>Ticket médio</span>
          <span />
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando clientes...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum cliente encontrado para os filtros selecionados.
          </div>
        ) : (
          paginados.map((c, i) => {
            const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || { label: c.status, color: dark ? '#6B6B8A' : '#6b7280', bg: dark ? 'rgba(107,107,138,0.12)' : '#f3f4f6' }
            return (
              <div
                key={c.id}
                onClick={() => abrirCliente(c)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 100px 110px 100px 110px 100px 36px',
                  padding: '13px 20px',
                  borderBottom: i < paginados.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                  gap: 8, alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {/* Nome */}
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                    {c.nome || '(sem nome)'}
                  </p>
                  {c.segmento && c.segmento !== 'a definir' && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {c.segmento}
                    </span>
                  )}
                </div>

                {/* Contato */}
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.telefone || c.email || '—'}
                  </p>
                  {c.telefone && c.email && (
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-light)' }}>{c.email}</p>
                  )}
                </div>

                {/* Status badge */}
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: cfg.color, background: cfg.bg,
                    padding: '3px 10px', borderRadius: 100, display: 'inline-block',
                  }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Última compra */}
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {fmtDate(c.data_ultima_compra)}
                </span>

                {/* Qtd pedidos */}
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>
                  {c.qtd_pedidos ?? 0}
                </span>

                {/* Total gasto */}
                <span style={{ fontSize: 12, color: c.total_gasto > 0 ? 'var(--text)' : 'var(--text-light)', fontWeight: c.total_gasto > 0 ? 600 : 400, textAlign: 'right' }}>
                  {fmt(c.total_gasto)}
                </span>

                {/* Ticket médio */}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                  {fmt(c.ticket_medio)}
                </span>

                {/* Seta */}
                <ChevronRight size={14} color="var(--text-light)" />
              </div>
            )
          })
        )}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
            style={{
              padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--surface)', fontSize: 12, cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer',
              color: paginaAtual === 1 ? 'var(--text-light)' : 'var(--text)', fontFamily: 'Montserrat',
            }}
          >
            ← Anterior
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Página {paginaAtual} de {totalPaginas}
          </span>

          {[...Array(Math.min(5, totalPaginas))].map((_, i) => {
            const pag = paginaAtual <= 3 ? i + 1 : paginaAtual - 2 + i
            if (pag < 1 || pag > totalPaginas) return null
            return (
              <button
                key={pag}
                onClick={() => setPaginaAtual(pag)}
                style={{
                  width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 8,
                  background: pag === paginaAtual ? 'var(--vinho)' : 'var(--surface)',
                  color: pag === paginaAtual ? 'white' : 'var(--text)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600,
                }}
              >
                {pag}
              </button>
            )
          })}

          <button
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            style={{
              padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--surface)', fontSize: 12, cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer',
              color: paginaAtual === totalPaginas ? 'var(--text-light)' : 'var(--text)', fontFamily: 'Montserrat',
            }}
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Drawer — Detalhes do Cliente */}
      {selecionado && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setSelecionado(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(14,41,85,0.35)',
              zIndex: 100, backdropFilter: 'blur(2px)',
            }}
          />

          {/* Painel lateral */}
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 460,
            background: 'var(--surface)', zIndex: 101,
            boxShadow: '-4px 0 40px rgba(14,41,85,0.18)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Header do drawer */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>
                  {selecionado.nome || '(sem nome)'}
                </h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  {(() => {
                    const cfg = STATUS_CONFIG[selecionado.status as keyof typeof STATUS_CONFIG] || { label: selecionado.status, color: dark ? '#6B6B8A' : '#6b7280', bg: dark ? 'rgba(107,107,138,0.12)' : '#f3f4f6' }
                    return (
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 100 }}>
                        {cfg.label}
                      </span>
                    )
                  })()}
                  {selecionado.segmento && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', padding: '3px 10px', borderRadius: 100, fontWeight: 500 }}>
                      {selecionado.segmento}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelecionado(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: '20px 28px', flex: 1 }}>

              {/* Info de contato */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>
                  Contato
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selecionado.telefone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Phone size={14} color="var(--text-muted)" />
                      <a href={`https://wa.me/55${selecionado.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 13, color: 'var(--azul)', textDecoration: 'none', fontWeight: 500 }}>
                        {selecionado.telefone} ↗
                      </a>
                    </div>
                  )}
                  {selecionado.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Mail size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{selecionado.email}</span>
                    </div>
                  )}
                  {selecionado.data_nascimento && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>
                        Nasc. {fmtDate(selecionado.data_nascimento)}
                      </span>
                    </div>
                  )}
                  {selecionado.vendedora_nome && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Tag size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>Vendedora: <strong>{selecionado.vendedora_nome}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Métricas do cliente */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>
                  Métricas de Compra
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Total Gasto', valor: fmt(selecionado.total_gasto) },
                    { label: 'Pedidos', valor: String(selecionado.qtd_pedidos ?? 0) },
                    { label: 'Ticket Médio', valor: fmt(selecionado.ticket_medio) },
                  ].map(({ label, valor }) => (
                    <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>{valor}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{label}</p>
                    </div>
                  ))}
                </div>
                {selecionado.data_ultima_compra && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 0' }}>
                    Última compra: <strong style={{ color: 'var(--text)' }}>{fmtDate(selecionado.data_ultima_compra)}</strong>
                  </p>
                )}
              </div>

              {/* Histórico de Pedidos */}
              <div>
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>
                  Últimos Pedidos
                </h3>
                {loadingPedidos ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Carregando pedidos...</p>
                ) : pedidosCliente.length === 0 ? (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                    <ShoppingBag size={22} color="var(--text-light)" style={{ marginBottom: 6 }} />
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Nenhum pedido encontrado</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pedidosCliente.map(p => (
                      <div key={p.id} style={{
                        background: 'var(--bg)', borderRadius: 10, padding: '12px 14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                            {fmt(p.valor_total)}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {fmtDate(p.data_pedido)} · {p.canal || 'Tiny'}
                          </p>
                        </div>
                        <span style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 100, fontWeight: 600,
                          background: p.status === 'aprovado' ? (dark ? 'rgba(34,212,106,0.12)' : '#dcfce7') : p.status === 'cancelado' ? (dark ? 'rgba(240,72,72,0.12)' : '#fee2e2') : (dark ? 'rgba(245,166,35,0.12)' : '#fef9c3'),
                          color: p.status === 'aprovado' ? (dark ? '#22d46a' : '#16a34a') : p.status === 'cancelado' ? (dark ? '#f04848' : '#dc2626') : (dark ? '#f5a623' : '#d97706'),
                        }}>
                          {p.status || 'pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botão WhatsApp */}
            {selecionado.telefone && (
              <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
                <a
                  href={`https://wa.me/55${selecionado.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#25d366', color: 'white', padding: '12px',
                    borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 700,
                    fontFamily: 'Montserrat',
                  }}
                >
                  💬 Abrir conversa no WhatsApp
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

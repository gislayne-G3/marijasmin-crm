import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Filter, ShoppingBag, TrendingUp, Calendar, ChevronRight, X } from 'lucide-react'
import { useDark, useStatusCores } from '../hooks/useDark'

interface Pedido {
  id: number
  tiny_id: number | null
  cliente_id: number | null
  cliente_nome_tiny: string | null
  vendedor_nome: string | null
  data_pedido: string
  valor_total: number
  status: string
  canal: string | null
  tipo_pedido: string | null
  pagamento_status: string | null
  codigo_rastreio: string | null
}

interface PedidoItem {
  id: number
  produto_nome: string
  quantidade: number
  preco_unitario: number
  tamanho: string | null
  cor: string | null
  sku: string | null
}


function fmt(val: number) {
  return val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0'
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function Pedidos() {
  const dark = useDark()
  const STATUS_COR = useStatusCores()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)
  const [itensPedido, setItensPedido] = useState<PedidoItem[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  const POR_PAGINA = 50

  useEffect(() => {
    carregarPedidos()
  }, [])

  async function carregarPedidos() {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select('id, tiny_id, cliente_id, cliente_nome_tiny, vendedor_nome, data_pedido, valor_total, status, canal, tipo_pedido, pagamento_status, codigo_rastreio')
      .order('data_pedido', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  async function abrirPedido(p: Pedido) {
    setSelecionado(p)
    setLoadingItens(true)
    const { data } = await supabase
      .from('pedido_itens')
      .select('id, produto_nome, quantidade, preco_unitario, tamanho, cor, sku')
      .eq('pedido_id', p.id)
    setItensPedido(data || [])
    setLoadingItens(false)
  }

  // Período
  function dataLimite() {
    const d = new Date()
    if (filtroPeriodo === '7d')  { d.setDate(d.getDate() - 7);   return d }
    if (filtroPeriodo === '30d') { d.setDate(d.getDate() - 30);  return d }
    if (filtroPeriodo === '90d') { d.setDate(d.getDate() - 90);  return d }
    if (filtroPeriodo === '1a')  { d.setFullYear(d.getFullYear() - 1); return d }
    return null
  }

  const filtrados = pedidos.filter(p => {
    const matchSearch = !search || [
      p.cliente_nome_tiny, String(p.tiny_id || ''), p.vendedor_nome
    ].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
    const limite = dataLimite()
    const matchPeriodo = !limite || new Date(p.data_pedido) >= limite
    return matchSearch && matchStatus && matchPeriodo
  })

  // Stats do filtro atual
  const totalFaturamento = filtrados.reduce((s, p) => s + (p.valor_total || 0), 0)
  const ticketMedio = filtrados.length ? totalFaturamento / filtrados.length : 0

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const inicio = (paginaAtual - 1) * POR_PAGINA
  const paginados = filtrados.slice(inicio, inicio + POR_PAGINA)

  function mudarFiltro(tipo: string, val: string) {
    setPaginaAtual(1)
    if (tipo === 'status') setFiltroStatus(val)
    if (tipo === 'periodo') setFiltroPeriodo(val)
    if (tipo === 'search') setSearch(val)
  }

  return (
    <div style={{ padding: '32px 40px', position: 'relative' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Pedidos</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          {pedidos.length.toLocaleString('pt-BR')} pedidos importados do Tiny ERP
        </p>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pedidos filtrados', valor: filtrados.length.toLocaleString('pt-BR'), icon: ShoppingBag, color: 'var(--azul)' },
          { label: 'Faturamento (filtro)', valor: fmt(totalFaturamento), icon: TrendingUp, color: '#16a34a' },
          { label: 'Ticket médio', valor: fmt(ticketMedio), icon: Calendar, color: 'var(--vinho)' },
        ].map(({ label, valor, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={color} />
              </div>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>{valor}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => mudarFiltro('search', e.target.value)}
            placeholder="Buscar por cliente, Nº pedido, vendedor..."
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              border: '1px solid var(--border)', borderRadius: 10,
              fontSize: 13, fontFamily: 'Montserrat', color: 'var(--text)',
              background: 'var(--surface)', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} color="var(--text-muted)" />
          <select
            value={filtroStatus}
            onChange={e => mudarFiltro('status', e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, fontFamily: 'Montserrat', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
          >
            <option value="todos">Todos os status</option>
            <option value="aprovado">Aprovado</option>
            <option value="faturado">Faturado</option>
            <option value="enviado">Enviado</option>
            <option value="entregue">Entregue</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <select
          value={filtroPeriodo}
          onChange={e => mudarFiltro('periodo', e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, fontFamily: 'Montserrat', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
        >
          <option value="todos">Todo o período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="1a">Último ano</option>
        </select>

        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {filtrados.length.toLocaleString('pt-BR')} pedido{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 2fr 1.2fr 110px 120px 100px 36px',
          padding: '10px 20px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 0.5, gap: 8,
        }}>
          <span>Nº Pedido</span>
          <span>Cliente</span>
          <span>Vendedor</span>
          <span>Data</span>
          <span style={{ textAlign: 'right' }}>Valor</span>
          <span>Status</span>
          <span />
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando pedidos...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum pedido encontrado.
          </div>
        ) : (
          paginados.map((p, i) => {
            const cfg = STATUS_COR[p.status] || { color: dark ? '#6B6B8A' : '#6b7280', bg: dark ? 'rgba(107,107,138,0.12)' : '#f3f4f6' }
            return (
              <div
                key={p.id}
                onClick={() => abrirPedido(p)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 2fr 1.2fr 110px 120px 100px 36px',
                  padding: '12px 20px',
                  borderBottom: i < paginados.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                  gap: 8, alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  #{p.tiny_id || p.id}
                </span>

                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {p.cliente_nome_tiny || '(sem nome)'}
                  </p>
                  {p.canal && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.canal}</span>
                  )}
                </div>

                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.vendedor_nome || '—'}
                </span>

                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {fmtDate(p.data_pedido)}
                </span>

                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', textAlign: 'right' }}>
                  {fmt(p.valor_total)}
                </span>

                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: cfg.color, background: cfg.bg,
                  padding: '3px 8px', borderRadius: 100, display: 'inline-block',
                }}>
                  {p.status || 'pendente'}
                </span>

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
            style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 12, cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', color: paginaAtual === 1 ? 'var(--text-light)' : 'var(--text)', fontFamily: 'Montserrat' }}
          >← Anterior</button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Página {paginaAtual} de {totalPaginas}
          </span>

          {[...Array(Math.min(5, totalPaginas))].map((_, i) => {
            const pag = paginaAtual <= 3 ? i + 1 : paginaAtual - 2 + i
            if (pag < 1 || pag > totalPaginas) return null
            return (
              <button key={pag} onClick={() => setPaginaAtual(pag)}
                style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: pag === paginaAtual ? 'var(--vinho)' : 'var(--surface)', color: pag === paginaAtual ? 'white' : 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600 }}>
                {pag}
              </button>
            )
          })}

          <button
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 12, cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer', color: paginaAtual === totalPaginas ? 'var(--text-light)' : 'var(--text)', fontFamily: 'Montserrat' }}
          >Próxima →</button>
        </div>
      )}

      {/* Drawer — Detalhes do Pedido */}
      {selecionado && (
        <>
          <div onClick={() => setSelecionado(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,41,85,0.35)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 440,
            background: 'var(--surface)', zIndex: 101,
            boxShadow: '-4px 0 40px rgba(14,41,85,0.18)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>
                  Pedido #{selecionado.tiny_id || selecionado.id}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {selecionado.cliente_nome_tiny} · {fmtDate(selecionado.data_pedido)}
                </p>
              </div>
              <button onClick={() => setSelecionado(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 28px', flex: 1 }}>

              {/* Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Valor Total', valor: fmt(selecionado.valor_total) },
                  { label: 'Status', valor: selecionado.status || 'pendente' },
                  { label: 'Canal', valor: selecionado.canal || '—' },
                  { label: 'Vendedor', valor: selecionado.vendedor_nome || '—' },
                ].map(({ label, valor }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>{valor}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Rastreio */}
              {selecionado.codigo_rastreio && (
                <div style={{ background: 'var(--vinho-light)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--vinho)', margin: 0 }}>
                    📦 Rastreio: {selecionado.codigo_rastreio}
                  </p>
                </div>
              )}

              {/* Itens */}
              <div>
                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>
                  Itens do Pedido
                </h3>
                {loadingItens ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Carregando itens...</p>
                ) : itensPedido.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Itens não importados ainda.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {itensPedido.map(item => (
                      <div key={item.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, flex: 1 }}>
                            {item.produto_nome}
                          </p>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', marginLeft: 8 }}>
                            {fmt(item.preco_unitario * item.quantidade)}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          Qtd: {item.quantidade}
                          {item.tamanho && ` · ${item.tamanho}`}
                          {item.cor && ` · ${item.cor}`}
                          {item.sku && ` · SKU: ${item.sku}`}
                        </p>
                      </div>
                    ))}
                    {/* Total */}
                    <div style={{ background: 'var(--vinho)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Total</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{fmt(selecionado.valor_total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

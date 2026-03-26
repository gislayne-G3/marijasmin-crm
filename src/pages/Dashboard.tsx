import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Package, Users, ShoppingBag, AlertTriangle, TrendingUp, Clock, XCircle, ArrowRight } from 'lucide-react'

interface Stats {
  produtos: number
  semDescricao: number
  clientes: number
  ativo: number
  esfriando: number
  inativo: number
  perdido: number
  pedidos: number
  faturamento: number
  ticketMedio: number
  pedidos30d: number
  faturamento30d: number
}

interface UltimoPedido {
  id: number
  tiny_id: number | null
  cliente_nome_tiny: string | null
  data_pedido: string
  valor_total: number
  status: string
}

function fmt(val: number) {
  if (!val) return 'R$ 0'
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtFull(val: number) {
  return val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0'
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

const STATUS_COR: Record<string, { color: string; bg: string }> = {
  aprovado:  { color: '#16a34a', bg: '#dcfce7' },
  faturado:  { color: '#0e7490', bg: '#cffafe' },
  enviado:   { color: '#7c3aed', bg: '#ede9fe' },
  entregue:  { color: '#15803d', bg: '#bbf7d0' },
  cancelado: { color: '#dc2626', bg: '#fee2e2' },
  pendente:  { color: '#d97706', bg: '#fef9c3' },
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    produtos: 0, semDescricao: 0,
    clientes: 0, ativo: 0, esfriando: 0, inativo: 0, perdido: 0,
    pedidos: 0, faturamento: 0, ticketMedio: 0, pedidos30d: 0, faturamento30d: 0,
  })
  const [ultimosPedidos, setUltimosPedidos] = useState<UltimoPedido[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [produtos, semDesc, clientes, pedidosStats, pedidos30d, ultimos] = await Promise.all([
        supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('ativo', true).is('descricao', null),
        supabase.from('clientes').select('status'),
        supabase.from('pedidos').select('valor_total, status'),
        supabase.from('pedidos').select('valor_total')
          .gte('data_pedido', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        supabase.from('pedidos')
          .select('id, tiny_id, cliente_nome_tiny, data_pedido, valor_total, status')
          .order('data_pedido', { ascending: false })
          .limit(6),
      ])

      const clientesList = clientes.data || []
      const faturamentoTotal = (pedidosStats.data || []).reduce((s, p) => s + (p.valor_total || 0), 0)
      const faturamento30 = (pedidos30d.data || []).reduce((s, p) => s + (p.valor_total || 0), 0)

      setStats({
        produtos: produtos.count || 0,
        semDescricao: semDesc.count || 0,
        clientes: clientesList.length,
        ativo:     clientesList.filter(c => c.status === 'ativo').length,
        esfriando: clientesList.filter(c => c.status === 'esfriando').length,
        inativo:   clientesList.filter(c => c.status === 'inativo').length,
        perdido:   clientesList.filter(c => c.status === 'perdido').length,
        pedidos: pedidosStats.data?.length || 0,
        faturamento: faturamentoTotal,
        ticketMedio: pedidosStats.data?.length ? faturamentoTotal / pedidosStats.data.length : 0,
        pedidos30d: pedidos30d.data?.length || 0,
        faturamento30d: faturamento30,
      })
      setUltimosPedidos((ultimos.data || []) as UltimoPedido[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando dashboard...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '32px 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>
          Bem-vinda, Gislayne 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Painel CRM · Marijasmin Moda Feminina Cristã
        </p>
      </div>

      {/* Faturamento — Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Faturamento Histórico */}
        <div style={{ background: 'linear-gradient(135deg, #0e2955, #1a4080)', borderRadius: 16, padding: '22px 24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={16} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Faturamento histórico
            </span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>{fmt(stats.faturamento)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
            {stats.pedidos.toLocaleString('pt-BR')} pedidos · Ticket médio {fmtFull(stats.ticketMedio)}
          </p>
        </div>

        {/* Últimos 30 dias */}
        <div style={{ background: 'linear-gradient(135deg, #8e2753, #b03366)', borderRadius: 16, padding: '22px 24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar30 />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Últimos 30 dias
            </span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>{fmt(stats.faturamento30d)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
            {stats.pedidos30d} pedidos recentes
          </p>
        </div>

        {/* Meta */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10 }}>🎯</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Meta mensal
            </span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--azul)', margin: 0 }}>R$ 500k</p>
          <div style={{ marginTop: 8 }}>
            <div style={{ background: 'var(--border)', borderRadius: 100, height: 6, overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg, var(--vinho), var(--azul))',
                width: `${Math.min(100, (stats.faturamento30d / 500000) * 100)}%`,
                height: '100%', borderRadius: 100, transition: 'width 1s',
              }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '5px 0 0' }}>
              {((stats.faturamento30d / 500000) * 100).toFixed(1)}% da meta
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Clientes + Produtos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Clientes */}
        <div
          onClick={() => navigate('/clientes')}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(14,41,85,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(14,41,85,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={16} color="var(--azul)" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>Clientes</span>
            </div>
            <ArrowRight size={14} color="var(--text-light)" />
          </div>

          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--azul)', margin: '0 0 12px' }}>
            {stats.clientes.toLocaleString('pt-BR')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { label: 'Ativos', val: stats.ativo, color: '#16a34a' },
              { label: 'Esfriando', val: stats.esfriando, color: '#d97706' },
              { label: 'Inativos', val: stats.inativo, color: '#6b7280' },
              { label: 'Perdidos', val: stats.perdido, color: '#dc2626' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 4px', background: `${color}10`, borderRadius: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color, margin: 0 }}>{val.toLocaleString('pt-BR')}</p>
                <p style={{ fontSize: 10, color, margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Produtos */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(142,39,83,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={16} color="var(--vinho)" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>Catálogo PIM</span>
            </div>
            <button
              onClick={() => navigate('/pim')}
              style={{ fontSize: 11, color: 'var(--vinho)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Ver tudo <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul)', margin: 0 }}>{stats.produtos}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Produtos ativos</p>
            </div>
            <div
              onClick={() => navigate('/pim')}
              style={{ background: stats.semDescricao > 0 ? '#fef9c3' : 'var(--bg)', border: stats.semDescricao > 0 ? '1px solid #fde047' : '1px solid transparent', borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: stats.semDescricao > 0 ? '#d97706' : 'var(--azul)', margin: 0 }}>
                  {stats.semDescricao}
                </p>
                {stats.semDescricao > 0 && <AlertTriangle size={14} color="#d97706" />}
              </div>
              <p style={{ fontSize: 11, color: stats.semDescricao > 0 ? '#d97706' : 'var(--text-muted)', margin: 0, fontWeight: stats.semDescricao > 0 ? 600 : 400 }}>
                Sem descrição
              </p>
            </div>
          </div>

          {stats.semDescricao > 0 && (
            <button
              onClick={() => navigate('/pim')}
              style={{
                marginTop: 12, width: '100%', padding: '9px', borderRadius: 8,
                background: '#d97706', color: 'white', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat',
              }}
            >
              ✍️ Gerar descrições com IA agora
            </button>
          )}
        </div>
      </div>

      {/* Últimos Pedidos */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(22,163,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={16} color="#16a34a" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>Últimos Pedidos</span>
          </div>
          <button
            onClick={() => navigate('/pedidos')}
            style={{ fontSize: 11, color: 'var(--azul)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Ver todos os {stats.pedidos.toLocaleString('pt-BR')} pedidos <ArrowRight size={12} />
          </button>
        </div>

        {ultimosPedidos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Nenhum pedido encontrado.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ultimosPedidos.map((p, i) => {
              const cfg = STATUS_COR[p.status] || { color: '#6b7280', bg: '#f3f4f6' }
              return (
                <div
                  key={p.id}
                  onClick={() => navigate('/pedidos')}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 110px 110px 90px',
                    padding: '11px 6px',
                    borderBottom: i < ultimosPedidos.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', gap: 12, alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    #{p.tiny_id || p.id}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {p.cliente_nome_tiny || '(sem nome)'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(p.data_pedido)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>
                    {fmtFull(p.valor_total)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: 100, display: 'inline-block' }}>
                    {p.status || 'pendente'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alerta de clientes perdidos */}
      {stats.perdido > 0 && (
        <div
          onClick={() => navigate('/clientes')}
          style={{
            marginTop: 16, background: '#fee2e2', border: '1px solid #fca5a5',
            borderRadius: 14, padding: '16px 20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <XCircle size={18} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', margin: 0 }}>
              {stats.perdido.toLocaleString('pt-BR')} clientes perdidos precisam de atenção
            </p>
            <p style={{ fontSize: 12, color: '#b91c1c', margin: '2px 0 0' }}>
              Clique para ver a lista e recuperar esses clientes via campanha de reativação
            </p>
          </div>
          <ArrowRight size={16} color="#dc2626" />
        </div>
      )}

      {/* Alerta clientes esfriando */}
      {stats.esfriando > 0 && (
        <div
          onClick={() => navigate('/clientes')}
          style={{
            marginTop: 10, background: '#fef9c3', border: '1px solid #fde047',
            borderRadius: 14, padding: '14px 20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>
              {stats.esfriando.toLocaleString('pt-BR')} clientes esfriando — reative antes que virem perdidos
            </p>
            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>
              Última compra entre 31-90 dias atrás
            </p>
          </div>
          <ArrowRight size={16} color="#d97706" />
        </div>
      )}
    </div>
  )
}

// Ícone inline de calendário 30d
function Calendar30() {
  return (
    <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>30</span>
    </div>
  )
}

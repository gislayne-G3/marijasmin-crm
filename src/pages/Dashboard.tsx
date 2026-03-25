import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Package, Users, ShoppingBag, TrendingUp, ArrowRight } from 'lucide-react'

interface Stats { produtos: number; clientes: number; pedidos: number; semDescricao: number }

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ produtos: 0, clientes: 0, pedidos: 0, semDescricao: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [p, c, ped, sd] = await Promise.all([
        supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('pedidos').select('*', { count: 'exact', head: true }),
        supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('ativo', true).is('descricao', null),
      ])
      setStats({
        produtos: p.count || 0,
        clientes: c.count || 0,
        pedidos: ped.count || 0,
        semDescricao: sd.count || 0,
      })
    }
    load()
  }, [])

  const cards = [
    { label: 'Produtos ativos', value: stats.produtos, icon: Package, color: 'var(--vinho)', to: '/pim' },
    { label: 'Clientes', value: stats.clientes.toLocaleString('pt-BR'), icon: Users, color: 'var(--azul)', to: '/clientes' },
    { label: 'Pedidos', value: stats.pedidos.toLocaleString('pt-BR'), icon: ShoppingBag, color: '#16a34a', to: null },
    { label: 'Sem descrição', value: stats.semDescricao, icon: TrendingUp, color: '#d97706', to: '/pim' },
  ]

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Bem-vinda, Gislayne</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Painel CRM · Moda Feminina Cristã</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {cards.map(({ label, value, icon: Icon, color, to }) => (
          <div
            key={label}
            onClick={() => to && navigate(to)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px 22px', cursor: to ? 'pointer' : 'default',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => to && (((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(14,41,85,0.1)'), ((e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'))}
            onMouseLeave={e => to && (((e.currentTarget as HTMLElement).style.boxShadow = 'none'), ((e.currentTarget as HTMLElement).style.transform = 'none'))}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              {to && <ArrowRight size={14} color="var(--text-light)" />}
            </div>
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>{value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)', margin: '0 0 16px' }}>Acesso rápido</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: '📦 Catálogo PIM', desc: 'Fotos, medidas, descrições', to: '/pim' },
            { label: '👥 Clientes', desc: '3.042 contatos', to: '/clientes' },
            { label: '🔗 Linktree', desc: 'Links da marca', to: '/linktree' },
          ].map(({ label, desc, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                textAlign: 'left', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--vinho)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

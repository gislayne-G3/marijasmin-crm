import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Package, Users, Link2, LogOut, ShoppingBag, RefreshCw, ShoppingCart, MessageCircle, UserCheck } from 'lucide-react'
import { logout } from '../lib/auth'

const nav = [
  { to: '/',              icon: LayoutGrid,  label: 'Dashboard' },
  { to: '/pim',          icon: Package,     label: 'Catálogo PIM' },
  { to: '/clientes',     icon: Users,       label: 'Clientes' },
  { to: '/pedidos',      icon: ShoppingCart,   label: 'Pedidos' },
  { to: '/atendimento', icon: MessageCircle, label: 'Atendimento' },
  { to: '/vendedora',   icon: UserCheck,     label: 'Meu Painel' },
  { to: '/sincronizacao', icon: RefreshCw,   label: 'Sincronização' },
  { to: '/linktree',     icon: Link2,       label: 'Linktree' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={{ background: 'var(--azul)', width: 220, minHeight: '100vh', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--vinho)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShoppingBag size={18} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0, letterSpacing: '-0.3px' }}>marijasmin</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0, fontWeight: 500 }}>CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px',
              color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
              background: isActive ? 'rgba(142,39,83,0.35)' : 'transparent',
              textDecoration: 'none',
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              borderLeft: isActive ? '3px solid #8e2753' : '3px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, fontFamily: 'Montserrat',
            padding: '6px 4px', width: '100%',
          }}
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  )
}

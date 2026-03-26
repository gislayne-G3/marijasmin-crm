import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PimLista from './pages/pim/PimLista'
import PimEditor from './pages/pim/PimEditor'
import Clientes from './pages/Clientes'
import Pedidos from './pages/Pedidos'
import Linktree from './pages/Linktree'
import Sincronizacao from './pages/Sincronizacao'
import Atendimento from './pages/Atendimento'
import PainelVendedora from './pages/PainelVendedora'
import DirecaoComercial from './pages/DirecaoComercial'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  )
}

function Protected({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</p>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<Protected user={user}><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/pim" element={<Protected user={user}><Layout><PimLista /></Layout></Protected>} />
        <Route path="/pim/:id" element={<Protected user={user}><Layout><PimEditor /></Layout></Protected>} />
        <Route path="/clientes" element={<Protected user={user}><Layout><Clientes /></Layout></Protected>} />
        <Route path="/pedidos" element={<Protected user={user}><Layout><Pedidos /></Layout></Protected>} />
        <Route path="/atendimento" element={<Protected user={user}><Layout><Atendimento /></Layout></Protected>} />
        <Route path="/vendedora" element={<Protected user={user}><Layout><PainelVendedora /></Layout></Protected>} />
        <Route path="/direcao" element={<Protected user={user}><Layout><DirecaoComercial /></Layout></Protected>} />
        <Route path="/linktree" element={<Protected user={user}><Layout><Linktree /></Layout></Protected>} />
        <Route path="/sincronizacao" element={<Protected user={user}><Layout><Sincronizacao /></Layout></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

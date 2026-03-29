import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarProdutos, CAT_ICON, type ProdutoComCount } from '../../lib/pim'
import { apiPost } from '../../lib/api'
import { Search, ChevronRight, ImageOff, Package, AlertTriangle, RefreshCw, DollarSign } from 'lucide-react'

const CATS = ['', 'vestidos', 'conjuntos', 'macacoes', 'blusas', 'calcas']
const CAT_LABEL: Record<string, string> = { '': 'Todos', vestidos: 'Vestidos', conjuntos: 'Conjuntos', macacoes: 'Macacões', blusas: 'Blusas', calcas: 'Calças' }

function stockColor(qty: number) {
  if (qty === 0) return '#e74c3c'
  if (qty <= 3) return '#f39c12'
  return '#27ae60'
}

export default function PimLista() {
  const [produtos, setProdutos] = useState<ProdutoComCount[]>([])
  const [busca, setBusca] = useState('')
  const [cat, setCat] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncPrecos, setSyncPrecos] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      const data = await buscarProdutos(busca, cat)
      setProdutos(data)
      setLoading(false)
    }, 280)
    return () => clearTimeout(t)
  }, [busca, cat])

  const semEstoque = produtos.filter(p => p.estoque === 0).length
  const baixoEstoque = produtos.filter(p => p.estoque > 0 && p.estoque <= 3).length

  async function sincronizarEstoque() {
    setSyncing(true)
    setSyncMsg('🔄 Sincronizando estoque do Tiny...')
    try {
      const res = await apiPost('/api/tiny-sync-estoque')
      const data = await res.json()
      setSyncMsg(`✅ Estoque atualizado! ${data.atualizados} variações sincronizadas.`)
      // Recarrega lista
      const prods = await buscarProdutos(busca, cat)
      setProdutos(prods)
    } catch {
      setSyncMsg('❌ Erro ao sincronizar estoque')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 5000)
    }
  }

  async function sincronizarPrecos() {
    setSyncPrecos(true)
    setSyncMsg('🔄 Puxando preços do Tiny (atacado + promo)...')
    try {
      const res = await apiPost('/api/tiny-sync-precos')
      const data = await res.json()
      const promoCount = (data.resultados || []).filter((r: { preco_promo: number | null }) => r.preco_promo && r.preco_promo > 0).length
      setSyncMsg(`✅ Preços atualizados! ${data.atualizados} produtos. ${promoCount} em promoção.`)
      const prods = await buscarProdutos(busca, cat)
      setProdutos(prods)
    } catch {
      setSyncMsg('❌ Erro ao sincronizar preços')
    } finally {
      setSyncPrecos(false)
      setTimeout(() => setSyncMsg(null), 5000)
    }
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={22} color="var(--vinho)" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Estoque & Catálogo</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {syncMsg && (
              <span style={{ fontSize: 11, fontWeight: 600, color: syncMsg.includes('❌') ? 'var(--danger)' : 'var(--success)', maxWidth: 350 }}>
                {syncMsg}
              </span>
            )}
            <button onClick={sincronizarPrecos} disabled={syncPrecos} style={btnSec}>
              <DollarSign size={14} /> {syncPrecos ? 'Sincronizando...' : 'Sync Preços Tiny'}
            </button>
            <button onClick={sincronizarEstoque} disabled={syncing} style={btnPri}>
              <RefreshCw size={14} /> {syncing ? 'Sincronizando...' : 'Sync Estoque Tiny'}
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
          {produtos.length} produtos · Preços de <strong>atacado</strong> (Tiny ERP)
          {semEstoque > 0 && <> · <span style={{ color: '#e74c3c', fontWeight: 600 }}>{semEstoque} sem estoque</span></>}
          {baixoEstoque > 0 && <> · <span style={{ color: '#f39c12', fontWeight: 600 }}>{baixoEstoque} estoque baixo</span></>}
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou referência..."
            style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {CATS.map(c => (
            <button
              key={c} onClick={() => setCat(c)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat',
                border: cat === c ? '1.5px solid var(--vinho)' : '1px solid var(--border)',
                background: cat === c ? 'var(--vinho-light)' : 'var(--surface)',
                color: cat === c ? 'var(--vinho)' : 'var(--text-muted)',
              }}
            >
              {c ? `${CAT_ICON[c] || ''} ${CAT_LABEL[c]}` : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Header da tabela */}
      <div style={{
        display: 'grid', gridTemplateColumns: '56px 1fr 120px 120px 90px 40px',
        gap: 14, padding: '10px 20px', fontSize: 10, fontWeight: 700,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
        borderBottom: '2px solid var(--border)',
      }}>
        <span />
        <span>Produto</span>
        <span style={{ textAlign: 'right' }}>Atacado</span>
        <span style={{ textAlign: 'right' }}>Promo</span>
        <span style={{ textAlign: 'center' }}>Estoque</span>
        <span />
      </div>

      {/* Lista */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando produtos...</div>
        ) : produtos.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum produto encontrado.</div>
        ) : (
          produtos.map((p, i) => {
            const temPromo = p.preco_promocional && p.preco_promocional > 0
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/pim/${p.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '56px 1fr 120px 120px 90px 40px',
                  gap: 14, alignItems: 'center', padding: '12px 20px',
                  borderBottom: i < produtos.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                {/* Foto */}
                <div style={{ width: 44, height: 56, borderRadius: 6, background: 'var(--bg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {p.imagem_url
                    ? <img src={p.imagem_url} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={16} color="var(--text-light)" /></div>
                  }
                </div>

                {/* Info */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.nome}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, background: 'var(--vinho-light)', color: 'var(--vinho)', padding: '2px 8px', borderRadius: 100, fontWeight: 600, textTransform: 'capitalize' }}>
                      {CAT_ICON[p.categoria] || ''} {p.categoria}
                    </span>
                    {p.sku && <span style={{ fontSize: 11, color: 'var(--text-light)' }}>REF: {p.sku}</span>}
                  </div>
                </div>

                {/* Preço ATACADO */}
                <p style={{
                  fontSize: 14, fontWeight: 700, margin: 0, textAlign: 'right',
                  color: temPromo ? 'var(--text-light)' : 'var(--azul)',
                  textDecoration: temPromo ? 'line-through' : 'none',
                }}>
                  {Number(p.preco_atacado || 0) > 0
                    ? `R$ ${Number(p.preco_atacado).toFixed(2)}`
                    : <span style={{ color: 'var(--text-light)', fontSize: 11 }}>—</span>
                  }
                </p>

                {/* Preço PROMO */}
                <p style={{ fontSize: 14, fontWeight: 700, color: '#e74c3c', margin: 0, textAlign: 'right' }}>
                  {temPromo
                    ? `R$ ${Number(p.preco_promocional).toFixed(2)}`
                    : <span style={{ color: 'var(--text-light)', fontSize: 11 }}>—</span>
                  }
                </p>

                {/* Estoque semáforo */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    {p.estoque === 0 && <AlertTriangle size={12} color="#e74c3c" />}
                    <span style={{ fontSize: 16, fontWeight: 800, color: stockColor(p.estoque) }}>
                      {p.estoque}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text-light)', textTransform: 'uppercase' }}>unid.</span>
                </div>

                <ChevronRight size={15} color="var(--text-light)" style={{ justifySelf: 'end' }} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const btnPri: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'var(--vinho)', color: 'white',
  border: 'none', borderRadius: 8, padding: '8px 14px',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat',
}

const btnSec: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat',
}

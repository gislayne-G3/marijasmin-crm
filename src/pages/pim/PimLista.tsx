import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarProdutos, CAT_ICON, type Produto } from '../../lib/pim'
import { Search, ChevronRight, CheckCircle2, AlertCircle, ImageOff } from 'lucide-react'

const CATS = ['', 'vestidos', 'conjuntos', 'macacoes', 'blusas', 'calcas']
const CAT_LABEL: Record<string, string> = { '': 'Todos', vestidos: 'Vestidos', conjuntos: 'Conjuntos', macacoes: 'Macacões', blusas: 'Blusas', calcas: 'Calças' }

export default function PimLista() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [busca, setBusca] = useState('')
  const [cat, setCat] = useState('')
  const [loading, setLoading] = useState(true)
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

  const comDesc = produtos.filter(p => p.descricao).length

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Catálogo PIM</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          {produtos.length} produtos ·{' '}
          <span style={{ color: 'var(--success)' }}>{comDesc} com descrição</span>
          {' · '}
          <span style={{ color: 'var(--warning)' }}>{produtos.length - comDesc} sem descrição</span>
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou referência..."
            style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Categorias */}
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

      {/* Lista */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando produtos...</div>
        ) : produtos.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum produto encontrado.</div>
        ) : (
          produtos.map((p, i) => (
            <div
              key={p.id}
              onClick={() => navigate(`/pim/${p.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 20px',
                borderBottom: i < produtos.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              {/* Foto */}
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                {p.imagem_url
                  ? <img src={p.imagem_url} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={16} color="var(--text-light)" /></div>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</p>
                  {p.descricao
                    ? <CheckCircle2 size={13} color="var(--success)" style={{ flexShrink: 0 }} />
                    : <AlertCircle size={13} color="var(--warning)" style={{ flexShrink: 0 }} />
                  }
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 11, background: 'var(--vinho-light)', color: 'var(--vinho)', padding: '2px 8px', borderRadius: 100, fontWeight: 600, textTransform: 'capitalize' }}>
                    {CAT_ICON[p.categoria] || ''} {p.categoria}
                  </span>
                  {p.sku && <span style={{ fontSize: 11, color: 'var(--text-light)' }}>REF: {p.sku}</span>}
                </div>
              </div>

              {/* Preços + Estoque */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>
                  R$ {Number(p.preco_atacado || 0).toFixed(2)}
                </p>
                <p style={{ fontSize: 11, color: p.estoque <= 3 ? 'var(--danger)' : 'var(--text-light)', margin: '2px 0 0', fontWeight: p.estoque <= 3 ? 600 : 400 }}>
                  Estoque: {p.estoque}
                </p>
              </div>

              <ChevronRight size={15} color="var(--text-light)" style={{ flexShrink: 0 }} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

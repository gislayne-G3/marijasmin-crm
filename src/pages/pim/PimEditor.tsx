import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  buscarProduto, salvarEstoqueVariacoes,
  TAMANHOS,
  type Produto, type ProdutoCor, type ProdutoVariacao,
} from '../../lib/pim'
import {
  ArrowLeft, Save, Package, RefreshCw, ImageOff,
  AlertTriangle, CheckCircle2, DollarSign, Tag,
} from 'lucide-react'

function stockColor(qty: number) {
  if (qty === 0) return '#e74c3c'
  if (qty <= 3) return '#f39c12'
  return '#27ae60'
}

export default function PimEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [produto, setProduto] = useState<Produto | null>(null)
  const [cores, setCores] = useState<ProdutoCor[]>([])
  const [variacoes, setVariacoes] = useState<ProdutoVariacao[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const prodId = parseInt(id || '0')

  useEffect(() => {
    if (!prodId) return
    carregarProduto()
  }, [prodId])

  async function carregarProduto() {
    setLoading(true)
    const { produto: p, cores: c, variacoes: v } = await buscarProduto(prodId)
    setProduto(p)
    setCores(c)
    setVariacoes(v)
    setLoading(false)
  }

  // Estoque helpers
  function getEstoque(cor: string, tam: string) {
    return variacoes.find(v => v.cor === cor && v.tamanho === tam)?.estoque ?? 0
  }
  function setEstoque(cor: string, tam: string, val: number) {
    setVariacoes(prev => prev.map(v =>
      v.cor === cor && v.tamanho === tam ? { ...v, estoque: val } : v
    ))
  }

  function estoqueTotal() {
    return variacoes.reduce((s, v) => s + v.estoque, 0)
  }

  function estoquePorTamanho(tam: string) {
    return variacoes.filter(v => v.tamanho === tam).reduce((s, v) => s + v.estoque, 0)
  }

  async function salvarEstoque() {
    if (!produto) return
    setSalvando(true)
    setStatus('Salvando estoque...')
    try {
      await salvarEstoqueVariacoes(variacoes)
      setStatus('✅ Estoque salvo!')
      setTimeout(() => setStatus(null), 3000)
    } catch {
      setStatus('❌ Erro ao salvar estoque')
    } finally {
      setSalvando(false)
    }
  }

  async function recarregar() {
    setStatus('🔄 Recarregando dados...')
    await carregarProduto()
    setStatus('✅ Dados atualizados!')
    setTimeout(() => setStatus(null), 3000)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
  if (!produto) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Produto não encontrado.</div>

  const total = estoqueTotal()
  const fotoP = cores[0]?.foto_frente || produto.imagem_url
  const coresUnicas = [...new Set(variacoes.map(v => v.cor))].filter(Boolean)
  const temPromo = produto.preco_promocional && produto.preco_promocional > 0
  const precoAtacado = Number(produto.preco_atacado || 0)
  const precoPromo = Number(produto.preco_promocional || 0)
  const precoVarejo = Number(produto.preco_varejo || 0)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0,
      }}>
        <button onClick={() => navigate('/pim')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>{produto.nome}</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {produto.categoria} · REF: {produto.sku || '—'}
            {produto.nuvemshop_id && <span style={{ marginLeft: 8, color: 'var(--success)', fontWeight: 600 }}>● Nuvemshop</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && (
            <span style={{ fontSize: 11, color: status.includes('Erro') || status.includes('❌') ? 'var(--danger)' : 'var(--success)', fontWeight: 600, maxWidth: 280, textAlign: 'right' }}>
              {status}
            </span>
          )}
          <button onClick={recarregar} style={btnSec}>
            <RefreshCw size={14} /> Recarregar
          </button>
          <button onClick={salvarEstoque} disabled={salvando} style={btnPri}>
            <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar Estoque'}
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px 60px' }}>

        {/* Card resumo do produto */}
        <div style={{
          display: 'flex', gap: 24, padding: '20px 24px',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          marginBottom: 24,
        }}>
          {/* Foto */}
          <div style={{ width: 120, height: 160, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg)', border: '1px solid var(--border)' }}>
            {fotoP
              ? <img src={fotoP} alt={produto.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageOff size={28} color="var(--text-light)" /></div>
            }
          </div>

          {/* Info + Preços */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--azul)', margin: '0 0 12px' }}>{produto.nome}</h2>

            {/* Preços */}
            <div style={{
              display: 'flex', gap: 20, padding: '14px 18px', borderRadius: 10,
              background: 'linear-gradient(135deg, #f8f4f0 0%, #fdf0f5 100%)',
              border: '1px solid var(--border)', marginBottom: 14,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <DollarSign size={13} color="var(--vinho)" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preço Atacado</span>
                </div>
                {temPromo ? (
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text-light)', textDecoration: 'line-through', marginRight: 8 }}>
                      R$ {precoAtacado.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#e74c3c' }}>
                      R$ {precoPromo.toFixed(2)}
                    </span>
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#fff',
                      background: '#e74c3c', padding: '2px 8px', borderRadius: 100,
                    }}>
                      {precoAtacado > 0 ? `-${Math.round((1 - precoPromo / precoAtacado) * 100)}%` : 'PROMO'}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--azul)' }}>
                    {precoAtacado > 0 ? `R$ ${precoAtacado.toFixed(2)}` : '—'}
                  </span>
                )}
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <Tag size={13} color="var(--text-light)" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Varejo (Nuvemshop)</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {precoVarejo > 0 ? `R$ ${precoVarejo.toFixed(2)}` : '—'}
                </span>
              </div>
              {precoAtacado > 0 && precoVarejo > 0 && (
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Margem</span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', margin: '2px 0 0' }}>
                    {Math.round(((precoVarejo / (temPromo ? precoPromo : precoAtacado)) - 1) * 100)}%
                  </p>
                </div>
              )}
            </div>

            {/* Dados básicos */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <InfoBlock label="Categoria" value={produto.categoria} />
              <InfoBlock label="REF / SKU" value={produto.sku || '—'} />
              <InfoBlock label="Composição" value={produto.composicao || '—'} />
            </div>
          </div>

          {/* Estoque total */}
          <div style={{
            textAlign: 'center', padding: '12px 24px', borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minWidth: 110,
          }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: stockColor(total), lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Estoque Total</span>
            {total === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#e74c3c' }}>
                <AlertTriangle size={12} /> <span style={{ fontSize: 10, fontWeight: 700 }}>ESGOTADO</span>
              </div>
            )}
            {total > 0 && total <= 5 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#f39c12' }}>
                <AlertTriangle size={12} /> <span style={{ fontSize: 10, fontWeight: 700 }}>BAIXO</span>
              </div>
            )}
          </div>
        </div>

        {/* Resumo por tamanho */}
        <div style={{ marginBottom: 24 }}>
          <SectionTitle icon={<Package size={15} />} title="Resumo por Tamanho" />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TAMANHOS.length}, 1fr)`, gap: 10 }}>
            {TAMANHOS.map(t => {
              const qty = estoquePorTamanho(t)
              return (
                <div key={t} style={{
                  textAlign: 'center', padding: '14px 10px', borderRadius: 10,
                  background: 'var(--surface)', border: `2px solid ${stockColor(qty)}20`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{t}</span>
                  <p style={{ fontSize: 28, fontWeight: 800, color: stockColor(qty), margin: '4px 0 0', lineHeight: 1 }}>{qty}</p>
                  {qty === 0 && <span style={{ fontSize: 9, color: '#e74c3c', fontWeight: 600 }}>ESGOTADO</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Estoque por cor × tamanho (editável) */}
        <div>
          <SectionTitle icon={<Save size={15} />} title="Estoque por Cor / Tamanho" subtitle="Edite os valores e clique em Salvar Estoque" />

          {coresUnicas.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, margin: 0 }}>Nenhuma variação encontrada para este produto.</p>
              <p style={{ fontSize: 11, margin: '8px 0 0', color: 'var(--text-light)' }}>As variações são sincronizadas do Tiny ERP via n8n.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--azul)' }}>
                    <th style={th}>Cor</th>
                    {TAMANHOS.map(t => <th key={t} style={{ ...th, textAlign: 'center' }}>{t}</th>)}
                    <th style={{ ...th, textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {coresUnicas.map((cor, ri) => {
                    const corObj = cores.find(c => c.cor === cor)
                    const totalCor = TAMANHOS.reduce((s, t) => s + getEstoque(cor, t), 0)
                    return (
                      <tr key={cor} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                        <td style={{ ...td, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {corObj?.cor_hex && (
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: corObj.cor_hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                          )}
                          {cor}
                        </td>
                        {TAMANHOS.map(t => (
                          <td key={t} style={{ ...td, textAlign: 'center', padding: '6px 8px' }}>
                            <input
                              type="number" min={0}
                              value={getEstoque(cor, t)}
                              onChange={e => setEstoque(cor, t, parseInt(e.target.value) || 0)}
                              style={{
                                width: 60, textAlign: 'center', padding: '6px 4px',
                                border: '1px solid var(--border)', borderRadius: 6,
                                fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat',
                                color: stockColor(getEstoque(cor, t)),
                                background: 'var(--surface)', outline: 'none',
                              }}
                            />
                          </td>
                        ))}
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: stockColor(totalCor) }}>{totalCor}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info de sync */}
        <div style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: 'var(--text-light)', margin: 0 }}>
            {produto.nuvemshop_last_sync
              ? `Último sync Nuvemshop: ${new Date(produto.nuvemshop_last_sync).toLocaleString('pt-BR')}`
              : 'Nunca sincronizado com a Nuvemshop'
            }
          </p>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: 'var(--text-light)' }}>
            <CheckCircle2 size={11} color="var(--success)" />
            Preços vêm do Tiny (atacado). Estoque: Nuvemshop = Tiny − 3 (reserva).
          </div>
        </div>

      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
   ═══════════════════════════════════════════════════════════════════ */

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '2px 0 0', textTransform: 'capitalize' }}>{value}</p>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ color: 'var(--vinho)' }}>{icon}</span>
      <div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
        {subtitle && <p style={{ fontSize: 10, color: 'var(--text-light)', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ESTILOS
   ═══════════════════════════════════════════════════════════════════ */

const th: React.CSSProperties = {
  padding: '10px 14px', color: 'white', fontSize: 11,
  fontWeight: 600, textAlign: 'left', letterSpacing: '0.3px',
}

const td: React.CSSProperties = {
  padding: '10px 14px', fontSize: 13, color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
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

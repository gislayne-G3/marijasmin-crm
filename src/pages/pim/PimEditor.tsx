import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  buscarProduto, salvarProduto, salvarCores, salvarVariacoes, salvarMedidas,
  uploadFoto, gerarHtmlDescricao,
  TAMANHOS, CAMPOS_MEDIDAS, LABEL_MEDIDAS,
  type Produto, type ProdutoCor, type ProdutoVariacao, type ProdutoMedida,
} from '../../lib/pim'
import { ArrowLeft, Sparkles, Save, Plus, Trash2, Upload, Eye, ScanSearch } from 'lucide-react'

type SlotFoto = 'foto_frente' | 'foto_costas' | 'foto_detalhe'
const SLOTS: { key: SlotFoto; label: string }[] = [
  { key: 'foto_frente',  label: 'Frente' },
  { key: 'foto_costas',  label: 'Costas' },
  { key: 'foto_detalhe', label: 'Detalhe' },
]

export default function PimEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [produto, setProduto] = useState<Produto | null>(null)
  const [cores, setCores] = useState<ProdutoCor[]>([])
  const [variacoes, setVariacoes] = useState<ProdutoVariacao[]>([])
  const [medidas, setMedidas] = useState<ProdutoMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [preview, setPreview] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const prodId = parseInt(id || '0')

  useEffect(() => {
    if (!prodId) return
    buscarProduto(prodId).then(({ produto: p, cores: c, variacoes: v, medidas: m }) => {
      setProduto(p)
      setCores(c.length ? c : [])
      setVariacoes(v.length ? v : inicializarVariacoes(c))
      setMedidas(m.length ? m : inicializarMedidas(p?.categoria || 'vestidos'))
      setLoading(false)
    })
  }, [prodId])

  function inicializarVariacoes(cs: ProdutoCor[]): ProdutoVariacao[] {
    if (!cs.length) return []
    return cs.flatMap(c => TAMANHOS.map(t => ({ produto_id: prodId, cor: c.cor, tamanho: t, estoque: 0, sku: null })))
  }

  function inicializarMedidas(cat: string): ProdutoMedida[] {
    const campos = CAMPOS_MEDIDAS[cat] || CAMPOS_MEDIDAS.vestidos
    return TAMANHOS.map(t => ({
      produto_id: prodId,
      tamanho: t,
      medidas: Object.fromEntries(campos.map(c => [c, ''])),
    }))
  }

  function getCampos() {
    return CAMPOS_MEDIDAS[produto?.categoria || 'vestidos'] || CAMPOS_MEDIDAS.vestidos
  }

  // Estoque por cor/tamanho
  function getEstoque(cor: string, tam: string) {
    return variacoes.find(v => v.cor === cor && v.tamanho === tam)?.estoque ?? 0
  }
  function setEstoque(cor: string, tam: string, val: number) {
    setVariacoes(prev => {
      const idx = prev.findIndex(v => v.cor === cor && v.tamanho === tam)
      if (idx >= 0) {
        const n = [...prev]; n[idx] = { ...n[idx], estoque: val }; return n
      }
      return [...prev, { produto_id: prodId, cor, tamanho: tam, estoque: val, sku: null }]
    })
  }

  // Medidas
  function getMedida(tam: string, campo: string) {
    return medidas.find(m => m.tamanho === tam)?.medidas[campo] || ''
  }
  function setMedidaVal(tam: string, campo: string, val: string) {
    setMedidas(prev => prev.map(m =>
      m.tamanho === tam ? { ...m, medidas: { ...m.medidas, [campo]: val } } : m
    ))
  }

  // Adicionar cor
  function addCor() {
    const nova: ProdutoCor = { produto_id: prodId, cor: 'Nova Cor', cor_hex: null, foto_frente: null, foto_costas: null, foto_detalhe: null }
    setCores(p => [...p, nova])
    setVariacoes(p => [...p, ...TAMANHOS.map(t => ({ produto_id: prodId, cor: 'Nova Cor', tamanho: t, estoque: 0, sku: null }))])
  }

  function removerCor(idx: number) {
    const corName = cores[idx].cor
    setCores(p => p.filter((_, i) => i !== idx))
    setVariacoes(p => p.filter(v => v.cor !== corName))
  }

  function updateCorNome(idx: number, novoNome: string) {
    const nomeAntigo = cores[idx].cor
    setCores(p => p.map((c, i) => i === idx ? { ...c, cor: novoNome } : c))
    setVariacoes(p => p.map(v => v.cor === nomeAntigo ? { ...v, cor: novoNome } : v))
  }

  // Upload foto
  async function handleFoto(corIdx: number, slot: SlotFoto, file: File) {
    const cor = cores[corIdx].cor
    setStatus('Enviando foto...')
    try {
      const url = await uploadFoto(prodId, cor, slot, file)
      setCores(p => p.map((c, i) => i === corIdx ? { ...c, [slot]: url } : c))
      setStatus(null)
    } catch {
      setStatus('Erro ao enviar foto')
    }
  }

  // Analisar fotos com IA (Claude Vision)
  async function analisarFotos() {
    if (!produto) return
    setAnalisando(true)
    setStatus('🔍 Analisando fotos com IA (pode levar ~30s)...')
    try {
      const res = await fetch('/api/pim-analisar-fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto_id: prodId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro na análise')

      // Recarrega dados do produto (cores, medidas atualizadas)
      const { cores: c, variacoes: v, medidas: m } = await buscarProduto(prodId).then(d => d)
      setCores(c.length ? c : cores)
      if (v.length) setVariacoes(v)
      if (m.length) setMedidas(m)

      const msg = `✅ ${data.fotos_analisadas} fotos analisadas · ${data.cores_atualizadas?.length || 0} cores · ${data.tabela_medidas_extraida ? 'Medidas extraídas!' : 'Sem tabela de medidas'}`
      setStatus(msg)
      setTimeout(() => setStatus(null), 5000)
    } catch (e: unknown) {
      setStatus(`Erro: ${e instanceof Error ? e.message : 'falha na análise'}`)
    } finally {
      setAnalisando(false)
    }
  }

  // Gerar descrição com IA
  async function gerarDescricao() {
    if (!produto) return
    setGerando(true)
    setStatus('Gerando descrição com IA...')
    try {
      const res = await fetch('/api/gerar-descricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: produto.nome,
          categoria: produto.categoria,
          cores: cores.map(c => c.cor),
          descricao_atual: produto.descricao || '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProduto(p => p ? { ...p, descricao: data.html } : p)
      setStatus('Descrição gerada!')
      setTimeout(() => setStatus(null), 2500)
    } catch {
      setStatus('Erro ao gerar descrição')
    } finally {
      setGerando(false)
    }
  }

  // Salvar tudo — Supabase + Nuvemshop
  async function salvar() {
    if (!produto) return
    setSalvando(true)
    setStatus('Salvando no Supabase...')
    try {
      const campos = getCampos()
      const htmlFinal = gerarHtmlDescricao(produto, produto.descricao || '', cores, medidas, campos)
      await Promise.all([
        salvarProduto(prodId, { ...produto, descricao: htmlFinal }),
        salvarCores(prodId, cores),
        salvarVariacoes(prodId, variacoes),
        salvarMedidas(prodId, medidas),
      ])

      // Sincronizar com Nuvemshop se tiver nuvemshop_id
      if (produto.nuvemshop_id) {
        // Passo 1: sincroniza descrição + preço + estoque
        setStatus('Sincronizando descrição e preços na Nuvemshop...')
        const variacoesComId = variacoes.filter(v => v.nuvemshop_variant_id)
        const resSync = await fetch('/api/pim-sync-nuvemshop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nuvemshop_id: produto.nuvemshop_id,
            descricao: htmlFinal,
            preco_varejo: produto.preco_varejo,
            preco_atacado: produto.preco_atacado,
            variacoes: variacoesComId.map(v => ({
              nuvemshop_variant_id: v.nuvemshop_variant_id,
              estoque: v.estoque,
            })),
          }),
        })
        const dataSync = await resSync.json()

        // Passo 2: sincroniza fotos por cor (vincula imagem à variação)
        const coresComFoto = cores.filter(c => c.foto_frente)
        if (coresComFoto.length > 0) {
          setStatus('Enviando fotos para a Nuvemshop (foto por cor)...')
          await fetch('/api/pim-sync-fotos-nuvemshop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produto_id: prodId }),
          })
        }

        if (dataSync.erros?.length) {
          setStatus(`✅ Salvo! Nuvemshop: ${dataSync.erros.length} aviso(s)`)
        } else {
          setStatus('✅ Salvo e sincronizado — descrição, estoque e fotos por cor!')
        }
      } else {
        setStatus('✅ Salvo com sucesso!')
      }
      setTimeout(() => setStatus(null), 3000)
    } catch {
      setStatus('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando produto...</div>
  )
  if (!produto) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Produto não encontrado.</div>
  )

  const campos = getCampos()

  return (
    <div style={{ padding: '28px 40px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate('/pim')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>{produto.nome}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'capitalize' }}>{produto.categoria} · REF: {produto.sku || '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 12, color: status.includes('Erro') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{status}</span>}
          <button onClick={analisarFotos} disabled={analisando} style={{ ...btnSecondary, color: 'var(--vinho)', borderColor: 'var(--vinho)' }}>
            <ScanSearch size={14} /> {analisando ? 'Analisando...' : '🤖 Analisar Fotos'}
          </button>
          <button onClick={() => setPreview(!preview)} style={btnSecondary}>
            <Eye size={14} /> Preview
          </button>
          <button onClick={salvar} disabled={salvando} style={btnPrimary}>
            <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Preços */}
      <Section title="Preços">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Preço Atacado (R$)">
            <input type="number" step="0.01" value={produto.preco_atacado || ''} onChange={e => setProduto(p => p ? { ...p, preco_atacado: parseFloat(e.target.value) } : p)} style={inputStyle} />
          </Field>
          <Field label="Preço Varejo (R$)">
            <input type="number" step="0.01" value={produto.preco_varejo || ''} onChange={e => setProduto(p => p ? { ...p, preco_varejo: parseFloat(e.target.value) } : p)} style={inputStyle} />
          </Field>
        </div>
      </Section>

      {/* Cores + Fotos + Estoque */}
      <Section title="Cores, Fotos e Estoque">
        {cores.map((cor, ci) => (
          <div key={ci} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
            {/* Nome da cor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input
                value={cor.cor}
                onChange={e => updateCorNome(ci, e.target.value)}
                style={{ ...inputStyle, fontWeight: 700, fontSize: 13, flex: 1 }}
                placeholder="Nome da cor/estampa"
              />
              <input type="color" value={cor.cor_hex || '#8e2753'}
                onChange={e => setCores(p => p.map((c, i) => i === ci ? { ...c, cor_hex: e.target.value } : c))}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }}
              />
              <button onClick={() => removerCor(ci)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                <Trash2 size={15} />
              </button>
            </div>

            {/* Fotos */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {SLOTS.map(({ key, label }) => (
                <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    onClick={() => fileRefs.current[`${ci}_${key}`]?.click()}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: '50%',
                      border: cor[key] ? '3px solid var(--vinho)' : '2px dashed var(--border)',
                      overflow: 'hidden', cursor: 'pointer', background: 'var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      maxWidth: 80, margin: '0 auto',
                    }}
                  >
                    {cor[key]
                      ? <img src={cor[key]!} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Upload size={18} color="var(--text-light)" />
                    }
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '5px 0 0', fontWeight: 600 }}>{label}</p>
                  <input
                    ref={el => { fileRefs.current[`${ci}_${key}`] = el }}
                    type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleFoto(ci, key, e.target.files[0])}
                  />
                </div>
              ))}
            </div>

            {/* Estoque M/G/GG */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estoque</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {TAMANHOS.map(t => (
                  <div key={t}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textAlign: 'center' }}>{t}</label>
                    <input
                      type="number" min={0}
                      value={getEstoque(cor.cor, t)}
                      onChange={e => setEstoque(cor.cor, t, parseInt(e.target.value) || 0)}
                      style={{ ...inputStyle, textAlign: 'center', fontWeight: 700 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button onClick={addCor} style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}>
          <Plus size={14} /> Adicionar Cor/Estampa
        </button>
      </Section>

      {/* Tabela de Medidas */}
      <Section title="Tabela de Medidas">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--azul)' }}>
                <th style={{ ...thStyle }}>Medida</th>
                {TAMANHOS.map(t => <th key={t} style={{ ...thStyle }}>{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {campos.map((campo, ri) => (
                <tr key={campo} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--azul)' }}>{LABEL_MEDIDAS[campo] || campo}</td>
                  {TAMANHOS.map(t => (
                    <td key={t} style={{ ...tdStyle }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={getMedida(t, campo)}
                          onChange={e => setMedidaVal(t, campo, e.target.value)}
                          placeholder="0"
                          style={{ ...inputStyle, textAlign: 'center', width: '100%', padding: '6px 8px' }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--text-light)', flexShrink: 0 }}>cm</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>* Medidas em centímetros</p>
      </Section>

      {/* Descrição */}
      <Section title="Descrição do Produto">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={gerarDescricao} disabled={gerando} style={{ ...btnPrimary, flex: 'none' }}>
            <Sparkles size={14} /> {gerando ? 'Gerando...' : produto.descricao ? '✨ Melhorar SEO com IA' : 'Gerar com IA'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 'auto 0' }}>
            {produto.descricao
              ? 'A IA melhora a descrição existente com foco em SEO e conversão.'
              : 'A IA cria a descrição no formato correto com base no produto.'}
          </p>
        </div>

        <textarea
          value={produto.descricao || ''}
          onChange={e => setProduto(p => p ? { ...p, descricao: e.target.value } : p)}
          rows={10}
          placeholder="Clique em 'Gerar com IA' ou escreva aqui o HTML da descrição..."
          style={{ ...inputStyle, width: '100%', resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace', fontSize: 12 }}
        />

        {preview && produto.descricao && (
          <div style={{ marginTop: 16, padding: '20px 24px', background: 'var(--surface)', border: '2px dashed var(--vinho-light)', borderRadius: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--vinho)', marginBottom: 12, textTransform: 'uppercase' }}>Preview da descrição</p>
            <div dangerouslySetInnerHTML={{ __html: produto.descricao }} />
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, color: 'var(--text)', background: 'var(--surface)',
  outline: 'none', boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'var(--vinho)', color: 'white',
  border: 'none', borderRadius: 9, padding: '9px 16px',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat',
}

const btnSecondary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 9, padding: '8px 14px',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat',
}

const thStyle: React.CSSProperties = {
  padding: '9px 14px', color: 'white', fontWeight: 600, fontSize: 12, textAlign: 'center',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center',
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  buscarProduto, salvarProduto, salvarCores, salvarVariacoes, salvarMedidas,
  uploadFoto, gerarHtmlDescricao,
  TAMANHOS, CAMPOS_MEDIDAS, LABEL_MEDIDAS, MEDIDAS_PADRAO, OCASIOES_DISPONIVEIS,
  type Produto, type ProdutoCor, type ProdutoVariacao, type ProdutoMedida,
} from '../../lib/pim'
import { apiPost } from '../../lib/api'
import {
  ArrowLeft, Sparkles, Save, Plus, Trash2, Upload, Eye, ScanSearch,
  ChevronDown, ChevronRight, FileText, Ruler, Camera, Search, Tag,
  DollarSign, Info, Package,
} from 'lucide-react'

type SlotFoto = 'foto_frente' | 'foto_costas' | 'foto_detalhe'
const SLOTS: { key: SlotFoto; label: string }[] = [
  { key: 'foto_frente', label: 'Frente' },
  { key: 'foto_costas', label: 'Costas' },
  { key: 'foto_detalhe', label: 'Detalhe' },
]

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════════ */
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

  // Estoque
  function getEstoque(cor: string, tam: string) {
    return variacoes.find(v => v.cor === cor && v.tamanho === tam)?.estoque ?? 0
  }
  function setEstoque(cor: string, tam: string, val: number) {
    setVariacoes(prev => {
      const idx = prev.findIndex(v => v.cor === cor && v.tamanho === tam)
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], estoque: val }; return n }
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

  // Aplicar medidas padrão
  function aplicarMedidasPadrao() {
    setMedidas(prev => prev.map(m => {
      const padrao = MEDIDAS_PADRAO[m.tamanho]
      if (!padrao) return m
      const novasMedidas = { ...m.medidas }
      for (const [campo, valor] of Object.entries(padrao)) {
        if (!novasMedidas[campo] || novasMedidas[campo] === '') {
          novasMedidas[campo] = valor
        }
      }
      return { ...m, medidas: novasMedidas }
    }))
    setStatus('Medidas padrão aplicadas!')
    setTimeout(() => setStatus(null), 2000)
  }

  // Cores
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
    } catch { setStatus('Erro ao enviar foto') }
  }

  // Analisar fotos IA
  async function analisarFotos() {
    if (!produto) return
    setAnalisando(true)
    setStatus('🔍 Analisando fotos com IA (pode levar ~30s)...')
    try {
      const res = await apiPost('/api/pim-analisar-fotos', { produto_id: prodId })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro na análise')
      const { cores: c, variacoes: v, medidas: m } = await buscarProduto(prodId).then(d => d)
      setCores(c.length ? c : cores)
      if (v.length) setVariacoes(v)
      if (m.length) setMedidas(m)
      setStatus(`✅ ${data.fotos_analisadas} fotos analisadas · ${data.cores_atualizadas?.length || 0} cores`)
      setTimeout(() => setStatus(null), 5000)
    } catch (e: unknown) {
      setStatus(`Erro: ${e instanceof Error ? e.message : 'falha'}`)
    } finally { setAnalisando(false) }
  }

  // Gerar descrição IA
  async function gerarDescricao() {
    if (!produto) return
    setGerando(true)
    setStatus('Gerando descrição com IA...')
    try {
      const res = await apiPost('/api/gerar-descricao', {
        nome: produto.nome, categoria: produto.categoria,
        cores: cores.map(c => c.cor), tecido: produto.composicao || '',
        descricao_atual: produto.descricao || '',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProduto(p => p ? { ...p, descricao: data.html, description_generated_at: new Date().toISOString() } : p)
      setStatus('Descrição gerada!')
      setTimeout(() => setStatus(null), 2500)
    } catch { setStatus('Erro ao gerar descrição') }
    finally { setGerando(false) }
  }

  // Gerar SEO com IA
  function gerarSeo() {
    if (!produto) return
    const nome = produto.nome
    const title = `${nome} | Marijasmin`.substring(0, 60)
    const meta = `${nome} da Marijasmin. Moda feminina cristã e modesta. Frete grátis acima de R$299. Troca em 7 dias.`.substring(0, 155)
    const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const alt = `${nome} ${produto.composicao || ''} moda cristã modesta marijasmin`.trim()
    setProduto(p => p ? { ...p, seo_title: title, seo_meta_description: meta, seo_slug: slug, seo_alt_text: alt } : p)
    setStatus('SEO gerado!')
    setTimeout(() => setStatus(null), 2000)
  }

  // Toggle ocasiões
  function toggleOcasiao(oc: string) {
    setProduto(p => {
      if (!p) return p
      const current = p.ocasioes || []
      return { ...p, ocasioes: current.includes(oc) ? current.filter(o => o !== oc) : [...current, oc] }
    })
  }

  // Salvar — Supabase + Nuvemshop
  async function salvar(sincronizar = true) {
    if (!produto) return
    setSalvando(true)
    setStatus(sincronizar ? 'Salvando e sincronizando...' : 'Salvando rascunho...')
    try {
      const campos = getCampos()
      const htmlFinal = gerarHtmlDescricao(produto, produto.descricao || '', cores, medidas, campos)
      await Promise.all([
        salvarProduto(prodId, { ...produto, descricao: htmlFinal }),
        salvarCores(prodId, cores),
        salvarVariacoes(prodId, variacoes),
        salvarMedidas(prodId, medidas),
      ])

      if (sincronizar && produto.nuvemshop_id) {
        setStatus('Sincronizando na Nuvemshop...')
        const variacoesComId = variacoes.filter(v => v.nuvemshop_variant_id)
        const resSync = await apiPost('/api/pim-sync-nuvemshop', {
          nuvemshop_id: produto.nuvemshop_id,
          descricao: htmlFinal,
          preco_varejo: produto.preco_varejo,
          preco_atacado: produto.preco_atacado,
          variacoes: variacoesComId.map(v => ({
            nuvemshop_variant_id: v.nuvemshop_variant_id,
            estoque: v.estoque,
          })),
        })
        const dataSync = await resSync.json()

        const coresComFoto = cores.filter(c => c.foto_frente)
        if (coresComFoto.length > 0) {
          setStatus('Enviando fotos para a Nuvemshop...')
          await apiPost('/api/pim-sync-fotos-nuvemshop', { produto_id: prodId })
        }

        setProduto(p => p ? { ...p, nuvemshop_last_sync: new Date().toISOString() } : p)
        setStatus(dataSync.erros?.length
          ? `✅ Salvo! Nuvemshop: ${dataSync.erros.length} aviso(s)`
          : '✅ Salvo e sincronizado com a Nuvemshop!')
      } else {
        setStatus(sincronizar ? '✅ Salvo com sucesso!' : '✅ Rascunho salvo (não publicado)')
      }
      setTimeout(() => setStatus(null), 4000)
    } catch { setStatus('❌ Erro ao salvar') }
    finally { setSalvando(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando produto...</div>
  if (!produto) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Produto não encontrado.</div>

  const campos = getCampos()
  const fotoP = cores[0]?.foto_frente || produto.imagem_url

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── HEADER FIXO ────────────────────────────────────────────── */}
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
            {produto.nuvemshop_id && <span style={{ marginLeft: 8, color: 'var(--success)', fontWeight: 600 }}>● Na Nuvemshop</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 11, color: status.includes('Erro') || status.includes('❌') ? 'var(--danger)' : 'var(--success)', fontWeight: 600, maxWidth: 280, textAlign: 'right' }}>{status}</span>}
          <button onClick={analisarFotos} disabled={analisando} style={{ ...btnSec, color: 'var(--vinho)', borderColor: 'var(--vinho)' }}>
            <ScanSearch size={14} /> {analisando ? 'Analisando...' : 'Analisar Fotos'}
          </button>
          <button onClick={() => salvar(false)} disabled={salvando} style={btnSec}>
            <Save size={14} /> Rascunho
          </button>
          <button onClick={() => salvar(true)} disabled={salvando} style={btnPri}>
            <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar e Sincronizar'}
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO: 2 PAINÉIS ────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═══ PAINEL ESQUERDO — FORMULÁRIOS ═══ */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px 60px' }}>

          {/* SEÇÃO 1 — Identificação (sempre visível) */}
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Package size={15} color="var(--vinho)" />
              <span style={secTitle}>Identificação</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Nome do produto">
                <input value={produto.nome} onChange={e => setProduto(p => p ? { ...p, nome: e.target.value } : p)} style={inp} />
              </Field>
              <Field label="SKU / Referência">
                <input value={produto.sku || ''} readOnly style={{ ...inp, background: 'var(--bg)', color: 'var(--text-muted)' }} />
              </Field>
              <Field label="Categoria">
                <select value={produto.categoria} onChange={e => setProduto(p => p ? { ...p, categoria: e.target.value } : p)} style={inp}>
                  <option value="vestidos">Vestidos</option>
                  <option value="conjuntos">Conjuntos</option>
                  <option value="macacoes">Macacões</option>
                  <option value="blusas">Blusas</option>
                  <option value="calcas">Calças</option>
                  <option value="saias">Saias</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={produto.ativo ? 'ativo' : 'inativo'} onChange={e => setProduto(p => p ? { ...p, ativo: e.target.value === 'ativo' } : p)} style={inp}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </Field>
            </div>
          </div>

          {/* SEÇÃO 2 — Preços */}
          <CollapsibleSection title="Preços" icon={<DollarSign size={15} />} defaultOpen>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Preço Varejo (R$)">
                <input type="number" step="0.01" value={produto.preco_varejo || ''} onChange={e => setProduto(p => p ? { ...p, preco_varejo: parseFloat(e.target.value) || 0 } : p)} style={inp} />
              </Field>
              <Field label="Preço Atacado (R$)">
                <input type="number" step="0.01" value={produto.preco_atacado || ''} onChange={e => setProduto(p => p ? { ...p, preco_atacado: parseFloat(e.target.value) || 0 } : p)} style={inp} />
              </Field>
              <Field label="Preço Promocional (R$)">
                <input type="number" step="0.01" value={produto.preco_promocional || ''} placeholder="Deixe vazio se não tem" onChange={e => setProduto(p => p ? { ...p, preco_promocional: e.target.value ? parseFloat(e.target.value) : null } : p)} style={inp} />
              </Field>
            </div>
            {produto.preco_promocional && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <Field label="Início da promoção">
                  <input type="date" value={produto.preco_promo_inicio || ''} onChange={e => setProduto(p => p ? { ...p, preco_promo_inicio: e.target.value || null } : p)} style={inp} />
                </Field>
                <Field label="Fim da promoção">
                  <input type="date" value={produto.preco_promo_fim || ''} onChange={e => setProduto(p => p ? { ...p, preco_promo_fim: e.target.value || null } : p)} style={inp} />
                </Field>
              </div>
            )}
          </CollapsibleSection>

          {/* SEÇÃO 3 — Descrição */}
          <CollapsibleSection title="Descrição" icon={<FileText size={15} />} defaultOpen>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={gerarDescricao} disabled={gerando} style={{ ...btnPri, flex: 'none' }}>
                <Sparkles size={14} /> {gerando ? 'Gerando...' : produto.descricao ? '✨ Melhorar com IA' : '🤖 Gerar com IA'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 'auto 0' }}>
                {produto.description_generated_at ? `Gerada em ${new Date(produto.description_generated_at).toLocaleDateString('pt-BR')}` : 'Nunca gerada por IA'}
              </p>
            </div>
            <textarea
              value={produto.descricao || ''}
              onChange={e => setProduto(p => p ? { ...p, descricao: e.target.value } : p)}
              rows={8}
              placeholder="Clique em 'Gerar com IA' ou escreva a descrição HTML..."
              style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontFamily: 'monospace', fontSize: 11 }}
            />
          </CollapsibleSection>

          {/* SEÇÃO 4 — Tabela de Medidas */}
          <CollapsibleSection title="Tabela de Medidas" icon={<Ruler size={15} />}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={aplicarMedidasPadrao} style={{ ...btnSec, fontSize: 11 }}>
                📏 Usar medidas padrão Marijasmin
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--azul)' }}>
                    <th style={th}>Tamanho</th>
                    {campos.map(c => <th key={c} style={th}>{LABEL_MEDIDAS[c] || c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {TAMANHOS.map((t, ri) => (
                    <tr key={t} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--azul)' }}>{t}</td>
                      {campos.map(c => (
                        <td key={c} style={td}>
                          <input type="text" value={getMedida(t, c)} onChange={e => setMedidaVal(t, c, e.target.value)} placeholder="—" style={{ ...inp, textAlign: 'center', padding: '5px 6px', fontSize: 12 }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <Field label="A modelo usa tamanho">
                <input value={produto.modelo_tamanho || ''} placeholder="M" onChange={e => setProduto(p => p ? { ...p, modelo_tamanho: e.target.value } : p)} style={inp} />
              </Field>
              <Field label="Altura da modelo">
                <input value={produto.modelo_altura || ''} placeholder="1,65m" onChange={e => setProduto(p => p ? { ...p, modelo_altura: e.target.value } : p)} style={inp} />
              </Field>
            </div>
          </CollapsibleSection>

          {/* SEÇÃO 5 — Fotos */}
          <CollapsibleSection title={`Cores e Fotos (${cores.length})`} icon={<Camera size={15} />}>
            {cores.map((cor, ci) => (
              <div key={ci} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <input value={cor.cor} onChange={e => updateCorNome(ci, e.target.value)} style={{ ...inp, fontWeight: 700, fontSize: 12, flex: 1 }} placeholder="Nome da cor" />
                  <input type="color" value={cor.cor_hex || '#8e2753'} onChange={e => setCores(p => p.map((c, i) => i === ci ? { ...c, cor_hex: e.target.value } : c))} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 1 }} />
                  <button onClick={() => removerCor(ci)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}><Trash2 size={14} /></button>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {SLOTS.map(({ key, label }) => (
                    <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                      <div onClick={() => fileRefs.current[`${ci}_${key}`]?.click()} style={{
                        width: '100%', aspectRatio: '1', borderRadius: '50%', maxWidth: 70, margin: '0 auto',
                        border: cor[key] ? '2px solid var(--vinho)' : '2px dashed var(--border)',
                        overflow: 'hidden', cursor: 'pointer', background: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {cor[key] ? <img src={cor[key]!} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Upload size={16} color="var(--text-light)" />}
                      </div>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 600 }}>{label}</p>
                      <input ref={el => { fileRefs.current[`${ci}_${key}`] = el }} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFoto(ci, key, e.target.files[0])} />
                    </div>
                  ))}
                </div>
                {/* Estoque por tamanho */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TAMANHOS.length}, 1fr)`, gap: 6 }}>
                  {TAMANHOS.map(t => (
                    <div key={t}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3, textAlign: 'center' }}>{t}</label>
                      <input type="number" min={0} value={getEstoque(cor.cor, t)} onChange={e => setEstoque(cor.cor, t, parseInt(e.target.value) || 0)} style={{ ...inp, textAlign: 'center', fontWeight: 700, padding: '5px 4px', fontSize: 12 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={addCor} style={{ ...btnSec, width: '100%', justifyContent: 'center' }}>
              <Plus size={14} /> Adicionar Cor/Estampa
            </button>
            <Field label="Notas sobre as fotos">
              <textarea value={produto.notas_fotos || ''} onChange={e => setProduto(p => p ? { ...p, notas_fotos: e.target.value } : p)} rows={2} placeholder="Ex: Falta foto costas azul marinho..." style={{ ...inp, resize: 'vertical', fontSize: 11 }} />
            </Field>
          </CollapsibleSection>

          {/* SEÇÃO 6 — SEO */}
          <CollapsibleSection title="SEO" icon={<Search size={15} />}>
            <button onClick={gerarSeo} style={{ ...btnSec, marginBottom: 12, fontSize: 11 }}>
              <Sparkles size={13} /> Gerar SEO automático
            </button>
            <Field label={`Title tag (${(produto.seo_title || '').length}/60)`}>
              <input value={produto.seo_title || ''} onChange={e => setProduto(p => p ? { ...p, seo_title: e.target.value } : p)} maxLength={60} placeholder="Nome Produto Tecido | Marijasmin" style={{ ...inp, borderColor: (produto.seo_title || '').length > 55 ? '#e74c3c' : undefined }} />
            </Field>
            <Field label={`Meta description (${(produto.seo_meta_description || '').length}/155)`}>
              <textarea value={produto.seo_meta_description || ''} onChange={e => setProduto(p => p ? { ...p, seo_meta_description: e.target.value } : p)} maxLength={155} rows={2} placeholder="Descrição para Google..." style={{ ...inp, resize: 'none', fontSize: 11 }} />
            </Field>
            <Field label="URL slug">
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', padding: '8px 4px 8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: '8px 0 0 8px' }}>marijasmin.com.br/produtos/</span>
                <input value={produto.seo_slug || ''} onChange={e => setProduto(p => p ? { ...p, seo_slug: e.target.value } : p)} style={{ ...inp, borderRadius: '0 8px 8px 0', fontSize: 11 }} />
              </div>
            </Field>
            <Field label="Alt text da foto principal">
              <input value={produto.seo_alt_text || ''} onChange={e => setProduto(p => p ? { ...p, seo_alt_text: e.target.value } : p)} placeholder="vestido midi crepe moda cristã marijasmin" style={inp} />
            </Field>
          </CollapsibleSection>

          {/* SEÇÃO 7 — Informações Adicionais */}
          <CollapsibleSection title="Informações Adicionais" icon={<Tag size={15} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Composição / Tecido">
                <input value={produto.composicao || ''} onChange={e => setProduto(p => p ? { ...p, composicao: e.target.value } : p)} placeholder="Ex: Crepe com elastano" style={inp} />
              </Field>
              <Field label="Modelagem">
                <select value={produto.modelagem || ''} onChange={e => setProduto(p => p ? { ...p, modelagem: e.target.value } : p)} style={inp}>
                  <option value="">Selecione</option>
                  <option value="Slim">Slim</option>
                  <option value="Regular">Regular</option>
                  <option value="Plus">Plus</option>
                </select>
              </Field>
              <Field label="Comprimento">
                <select value={produto.comprimento_tipo || ''} onChange={e => setProduto(p => p ? { ...p, comprimento_tipo: e.target.value } : p)} style={inp}>
                  <option value="">Selecione</option>
                  <option value="Mini">Mini</option>
                  <option value="Midi">Midi</option>
                  <option value="Maxi">Maxi</option>
                  <option value="Longo">Longo</option>
                </select>
              </Field>
              <Field label="Manga">
                <select value={produto.manga || ''} onChange={e => setProduto(p => p ? { ...p, manga: e.target.value } : p)} style={inp}>
                  <option value="">Selecione</option>
                  <option value="Sem manga">Sem manga</option>
                  <option value="Curta">Curta</option>
                  <option value="3/4">3/4</option>
                  <option value="Longa">Longa</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Ocasiões</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {OCASIOES_DISPONIVEIS.map(oc => {
                  const checked = produto.ocasioes?.includes(oc)
                  return (
                    <button key={oc} onClick={() => toggleOcasiao(oc)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${checked ? 'var(--vinho)' : 'var(--border)'}`,
                      background: checked ? 'var(--vinho)' : 'var(--surface)',
                      color: checked ? 'white' : 'var(--text)', fontFamily: 'Montserrat',
                    }}>{oc}</button>
                  )
                })}
              </div>
            </div>
          </CollapsibleSection>

          {/* SEÇÃO 8 — Estoque (somente leitura) */}
          <CollapsibleSection title="Estoque" icon={<Info size={15} />}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              Estoque gerenciado pelo Tiny ERP. O valor na Nuvemshop = Tiny − 3 (reserva).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TAMANHOS.length}, 1fr)`, gap: 8 }}>
              {TAMANHOS.map(t => {
                const total = variacoes.filter(v => v.tamanho === t).reduce((s, v) => s + v.estoque, 0)
                const cor = total === 0 ? '#e74c3c' : total <= 3 ? '#f39c12' : '#27ae60'
                return (
                  <div key={t} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{t}</span>
                    <p style={{ fontSize: 18, fontWeight: 800, color: cor, margin: '4px 0 0' }}>{total}</p>
                  </div>
                )
              })}
            </div>
            {produto.nuvemshop_last_sync && (
              <p style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 8 }}>
                Último sync: {new Date(produto.nuvemshop_last_sync).toLocaleString('pt-BR')}
              </p>
            )}
          </CollapsibleSection>

        </div>

        {/* ═══ PAINEL DIREITO — PREVIEW EM TEMPO REAL ═══ */}
        <div style={{
          width: 420, flexShrink: 0, borderLeft: '1px solid var(--border)',
          background: '#F7F5F2', overflow: 'auto', padding: '24px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Eye size={14} color="#810947" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#810947', textTransform: 'uppercase', letterSpacing: '1px' }}>Preview do Site</span>
          </div>

          {/* Card do produto */}
          <div style={{ background: '#FFFFFF', borderRadius: 6, overflow: 'hidden', border: '0.5px solid #E8E6E0' }}>
            {/* Foto */}
            {fotoP ? (
              <img src={fotoP} alt={produto.nome} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '3/4', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>Sem foto</div>
            )}

            <div style={{ padding: '16px 18px' }}>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {produto.ocasioes?.map(oc => (
                  <span key={oc} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 12, background: '#FBEAF0', color: '#810947', fontWeight: 600 }}>{oc}</span>
                ))}
              </div>

              {/* Nome */}
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#2E2E2E', margin: '0 0 8px', lineHeight: 1.3 }}>
                {produto.nome}
              </h2>

              {/* Preços */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                {produto.preco_promocional ? (
                  <>
                    <span style={{ fontSize: 13, color: '#8C8C8C', textDecoration: 'line-through' }}>R$ {(produto.preco_varejo || 0).toFixed(2)}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#810947' }}>R$ {produto.preco_promocional.toFixed(2)}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#2E2E2E' }}>R$ {(produto.preco_varejo || 0).toFixed(2)}</span>
                )}
              </div>

              {/* Composição */}
              {produto.composicao && (
                <p style={{ fontSize: 11, color: '#8C8C8C', margin: '0 0 6px' }}>
                  <strong>Composição:</strong> {produto.composicao}
                </p>
              )}
              {produto.modelagem && (
                <p style={{ fontSize: 11, color: '#8C8C8C', margin: '0 0 6px' }}>
                  <strong>Modelagem:</strong> {produto.modelagem} {produto.comprimento_tipo && `· ${produto.comprimento_tipo}`} {produto.manga && `· Manga ${produto.manga}`}
                </p>
              )}

              {/* Modelo */}
              {produto.modelo_tamanho && (
                <p style={{ fontSize: 11, color: '#8C8C8C', margin: '0 0 6px', fontStyle: 'italic' }}>
                  A modelo usa tamanho {produto.modelo_tamanho}{produto.modelo_altura && `, mede ${produto.modelo_altura}`}
                </p>
              )}

              {/* Tamanhos disponíveis */}
              <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
                {TAMANHOS.map(t => {
                  const total = variacoes.filter(v => v.tamanho === t).reduce((s, v) => s + v.estoque, 0)
                  return (
                    <div key={t} style={{
                      width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: total > 0 ? '0.5px solid #2E2E2E' : '0.5px solid #E8E6E0',
                      color: total > 0 ? '#2E2E2E' : '#ccc',
                      fontSize: 12, fontWeight: 600,
                      textDecoration: total === 0 ? 'line-through' : 'none',
                    }}>{t}</div>
                  )
                })}
              </div>

              {/* Cores disponíveis */}
              {cores.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {cores.map((c, i) => (
                    <div key={i} title={c.cor} style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: c.cor_hex || '#ccc',
                      border: '1.5px solid #E8E6E0',
                    }} />
                  ))}
                </div>
              )}

              {/* Botão comprar */}
              <button style={{
                width: '100%', padding: '12px 20px', background: '#810947', color: 'white',
                border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '1px', cursor: 'default',
                fontFamily: "'Inter', sans-serif",
              }}>COMPRAR</button>
            </div>
          </div>

          {/* Preview Descrição */}
          {produto.descricao && (
            <div style={{ marginTop: 16, background: '#FFFFFF', borderRadius: 6, padding: '18px', border: '0.5px solid #E8E6E0' }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: '#2E2E2E', margin: '0 0 12px' }}>Descrição</h3>
              <div style={{ fontSize: 12, color: '#2E2E2E', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: produto.descricao }} />
            </div>
          )}

          {/* Preview Tabela de Medidas */}
          {medidas.some(m => campos.some(c => m.medidas[c])) && (
            <div style={{ marginTop: 16, background: '#FFFFFF', borderRadius: 6, padding: '18px', border: '0.5px solid #E8E6E0' }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: '#2E2E2E', margin: '0 0 12px' }}>📏 Tabela de Medidas</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#810947' }}>
                    <th style={{ padding: '7px 10px', color: 'white', fontWeight: 600, fontSize: 10, textAlign: 'left' }}>TAM.</th>
                    {campos.map(c => <th key={c} style={{ padding: '7px 10px', color: 'white', fontWeight: 600, fontSize: 10, textAlign: 'center' }}>{LABEL_MEDIDAS[c]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {TAMANHOS.map((t, ri) => (
                    <tr key={t} style={{ background: ri % 2 === 0 ? '#fff' : '#fdf0f5' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 700, color: '#5a0630', borderBottom: '1px solid #e8c0d2' }}>{t}</td>
                      {campos.map(c => (
                        <td key={c} style={{ padding: '7px 10px', textAlign: 'center', color: '#333', borderBottom: '1px solid #e8c0d2' }}>
                          {getMedida(t, c) ? `${getMedida(t, c)} cm` : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {produto.modelo_tamanho && (
                <p style={{ fontSize: 10, color: '#7a4060', marginTop: 8, fontStyle: 'italic' }}>
                  A modelo usa tamanho {produto.modelo_tamanho}{produto.modelo_altura && `, mede ${produto.modelo_altura}`}
                </p>
              )}
            </div>
          )}

          {/* Preview SEO */}
          {produto.seo_title && (
            <div style={{ marginTop: 16, background: '#FFFFFF', borderRadius: 6, padding: '18px', border: '0.5px solid #E8E6E0' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#810947', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preview Google</p>
              <p style={{ fontSize: 16, color: '#1a0dab', margin: '0 0 2px', fontFamily: 'Arial', lineHeight: 1.3 }}>{produto.seo_title}</p>
              <p style={{ fontSize: 12, color: '#006621', margin: '0 0 4px' }}>marijasmin.com.br/produtos/{produto.seo_slug || '...'}</p>
              <p style={{ fontSize: 12, color: '#545454', margin: 0, lineHeight: 1.5 }}>{produto.seo_meta_description || 'Sem meta description'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
   ═══════════════════════════════════════════════════════════════════ */

function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ ...cardStyle, marginBottom: 12 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
      }}>
        <span style={{ color: 'var(--vinho)' }}>{icon}</span>
        <span style={secTitle}>{title}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ESTILOS
   ═══════════════════════════════════════════════════════════════════ */

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '16px 20px',
}

const secTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--azul)',
  textTransform: 'uppercase', letterSpacing: '0.5px',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: '1px solid var(--border)', borderRadius: 7,
  fontSize: 12, color: 'var(--text)', background: 'var(--surface)',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'Montserrat',
}

const btnPri: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'var(--vinho)', color: 'white',
  border: 'none', borderRadius: 8, padding: '8px 14px',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat',
}

const btnSec: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'var(--surface)', color: 'var(--text)',
  border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px',
  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat',
}

const th: React.CSSProperties = {
  padding: '8px 10px', color: 'white', fontWeight: 600, fontSize: 11, textAlign: 'center',
}

const td: React.CSSProperties = {
  padding: '6px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center',
}

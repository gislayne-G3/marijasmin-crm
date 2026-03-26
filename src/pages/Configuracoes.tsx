import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Settings, Users, MessageSquare, Target, Link2, Plus,
  Trash2, Edit3, Check, X, RefreshCw, Wifi, WifiOff,
  Save, Eye, EyeOff, Download,
} from 'lucide-react'

/* ─── TYPES ─── */
interface Usuario {
  id: string
  email: string
  role: string
  vendedora_id: number | null
  vendedora_nome: string | null
  ativo: boolean
  ultimo_acesso: string | null
  created_at: string
}

interface Template {
  id: string
  atalho: string
  nome: string
  conteudo: string
  categoria: string | null
  ativo: boolean
}

interface Vendedora {
  id: number
  nome: string
  meta_percentual_comissao: number
  ativa: boolean
}

interface MetaHistorico {
  id: string
  mes_ref: string
  meta_geral: number
  meta_minima: number
  status: string
  criada_em: string
}

/* ─── HELPERS ─── */
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ─── COMPONENT ─── */
export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'templates' | 'metas' | 'integracoes'>('usuarios')
  const [loading, setLoading] = useState(true)

  // Usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([])
  const [showFormUser, setShowFormUser] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoSenha, setNovoSenha] = useState('')
  const [novoRole, setNovoRole] = useState<'admin' | 'vendedora' | 'direcao'>('vendedora')
  const [novoVendedoraId, setNovoVendedoraId] = useState<number | null>(null)
  const [criandoUser, setCriandoUser] = useState(false)
  const [showSenha, setShowSenha] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<Template[]>([])
  const [showFormTemplate, setShowFormTemplate] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null)
  const [tplAtalho, setTplAtalho] = useState('')
  const [tplNome, setTplNome] = useState('')
  const [tplConteudo, setTplConteudo] = useState('')
  const [tplCategoria, setTplCategoria] = useState('')

  // Metas
  const [metasHistorico, setMetasHistorico] = useState<MetaHistorico[]>([])
  const [comissoesConfig, setComissoesConfig] = useState<Vendedora[]>([])
  const [editComissaoId, setEditComissaoId] = useState<number | null>(null)
  const [editComissaoVal, setEditComissaoVal] = useState('')

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setLoading(true)

    // Vendedoras
    const { data: vData } = await supabase
      .from('vendedoras')
      .select('id, nome, meta_percentual_comissao, ativa')
      .eq('tipo', 'vendedora_humana')
      .order('nome')
    setVendedoras((vData || []) as Vendedora[])
    setComissoesConfig((vData || []) as Vendedora[])

    // Usuários (profiles + user_roles)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    const usersList: Usuario[] = (rolesData || []).map((r: any) => ({
      id: r.id || r.user_id,
      email: r.email || r.user_email || '—',
      role: r.role || 'admin',
      vendedora_id: r.vendedora_id || null,
      vendedora_nome: null,
      ativo: r.ativo !== false,
      ultimo_acesso: r.ultimo_acesso || null,
      created_at: r.created_at,
    }))

    // Match vendedora nomes
    for (const u of usersList) {
      if (u.vendedora_id) {
        const v = (vData || []).find((vd: any) => vd.id === u.vendedora_id)
        if (v) u.vendedora_nome = v.nome
      }
    }
    setUsuarios(usersList)

    // Templates
    const { data: tplData } = await supabase
      .from('templates_mensagem')
      .select('*')
      .order('categoria', { ascending: true })
    setTemplates((tplData || []) as Template[])

    // Histórico de metas
    const { data: metasData } = await supabase
      .from('metas_mensais')
      .select('id, mes_ref, meta_geral, meta_minima, status, criada_em')
      .order('mes_ref', { ascending: false })
      .limit(12)
    setMetasHistorico((metasData || []) as MetaHistorico[])

    setLoading(false)
  }

  // ── Criar usuário
  async function criarUsuario() {
    if (!novoEmail || !novoSenha) return
    setCriandoUser(true)
    try {
      // Criar no Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: novoEmail,
        password: novoSenha,
        email_confirm: true,
      })

      if (error) {
        // Fallback: signUp (sem admin)
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: novoEmail,
          password: novoSenha,
        })
        if (signUpErr) throw signUpErr

        // Salvar role
        await supabase.from('user_roles').insert({
          user_id: signUpData.user?.id,
          user_email: novoEmail,
          role: novoRole,
          vendedora_id: novoRole === 'vendedora' ? novoVendedoraId : null,
          ativo: true,
        })
      } else {
        // Salvar role
        await supabase.from('user_roles').insert({
          user_id: data.user?.id,
          user_email: novoEmail,
          role: novoRole,
          vendedora_id: novoRole === 'vendedora' ? novoVendedoraId : null,
          ativo: true,
        })

        // Se vendedora, associar auth_user_id
        if (novoRole === 'vendedora' && novoVendedoraId && data.user) {
          await supabase
            .from('vendedoras')
            .update({ auth_user_id: data.user.id })
            .eq('id', novoVendedoraId)
        }
      }

      setShowFormUser(false)
      setNovoEmail('')
      setNovoSenha('')
      setNovoRole('vendedora')
      setNovoVendedoraId(null)
      await carregarDados()
    } catch (err: any) {
      alert(`Erro ao criar usuário: ${err.message}`)
    } finally {
      setCriandoUser(false)
    }
  }

  // ── Templates CRUD
  async function salvarTemplate() {
    if (!tplAtalho || !tplNome || !tplConteudo) return

    if (editTemplateId) {
      await supabase.from('templates_mensagem').update({
        atalho: tplAtalho,
        nome: tplNome,
        conteudo: tplConteudo,
        categoria: tplCategoria || null,
      }).eq('id', editTemplateId)
    } else {
      await supabase.from('templates_mensagem').insert({
        atalho: tplAtalho,
        nome: tplNome,
        conteudo: tplConteudo,
        categoria: tplCategoria || null,
        ativo: true,
      })
    }

    setShowFormTemplate(false)
    setEditTemplateId(null)
    setTplAtalho('')
    setTplNome('')
    setTplConteudo('')
    setTplCategoria('')
    await carregarDados()
  }

  async function toggleTemplate(id: string, ativo: boolean) {
    await supabase.from('templates_mensagem').update({ ativo: !ativo }).eq('id', id)
    await carregarDados()
  }

  function editarTemplate(t: Template) {
    setEditTemplateId(t.id)
    setTplAtalho(t.atalho)
    setTplNome(t.nome)
    setTplConteudo(t.conteudo)
    setTplCategoria(t.categoria || '')
    setShowFormTemplate(true)
  }

  // ── Comissão
  async function salvarComissao(vendedoraId: number) {
    const val = parseFloat(editComissaoVal)
    if (isNaN(val) || val < 0 || val > 100) return
    await supabase.from('vendedoras').update({ meta_percentual_comissao: val }).eq('id', vendedoraId)
    setEditComissaoId(null)
    await carregarDados()
  }

  // ── Exportar comissões CSV
  async function exportarComissoes() {
    const { data } = await supabase
      .from('comissoes')
      .select('vendedora_nome, mes_ref, total_vendas_bruto, total_frete, total_vendas_liquido, percentual_comissao, valor_comissao, status')
      .order('mes_ref', { ascending: false })

    if (!data || data.length === 0) { alert('Nenhuma comissão para exportar'); return }

    const header = 'Vendedora,Mês,Vendas Bruto,Frete,Vendas Líquido,%,Comissão,Status\n'
    const rows = data.map(c =>
      `"${c.vendedora_nome}",${c.mes_ref},${c.total_vendas_bruto},${c.total_frete},${c.total_vendas_liquido},${c.percentual_comissao},${c.valor_comissao},${c.status}`
    ).join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comissoes_marijasmin_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Carregando configurações...</div>
  }

  const roleLabel: Record<string, string> = { admin: 'Administrador', vendedora: 'Vendedora', direcao: 'Direção Comercial' }
  const roleColor: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#dbeafe', color: '#2563eb' },
    vendedora: { bg: '#fce7f3', color: '#be185d' },
    direcao: { bg: '#fef9c3', color: '#92400e' },
  }

  // ─── RENDER ───
  return (
    <div style={{ padding: '28px 36px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={20} color="var(--azul)" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Configurações</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Gestão de usuários, templates, metas e integrações</p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {([
          { key: 'usuarios', label: 'Usuários', icon: Users },
          { key: 'templates', label: 'Templates', icon: MessageSquare },
          { key: 'metas', label: 'Metas & Comissões', icon: Target },
          { key: 'integracoes', label: 'Integrações', icon: Link2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setAbaAtiva(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Montserrat',
              background: 'transparent',
              color: abaAtiva === key ? 'var(--vinho)' : 'var(--text-muted)',
              borderBottom: abaAtiva === key ? '2px solid var(--vinho)' : '2px solid transparent',
            }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ══════ ABA USUÁRIOS ══════ */}
      {abaAtiva === 'usuarios' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>Usuários do Sistema ({usuarios.length})</span>
            <button onClick={() => setShowFormUser(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--vinho)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat' }}>
              <Plus size={12} /> Novo Usuário
            </button>
          </div>

          {/* Form novo usuário */}
          {showFormUser && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', margin: '0 0 14px' }}>Criar Novo Usuário</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
                  <input value={novoEmail} onChange={e => setNovoEmail(e.target.value)} type="email" placeholder="email@exemplo.com"
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Senha temporária</label>
                  <div style={{ position: 'relative' }}>
                    <input value={novoSenha} onChange={e => setNovoSenha(e.target.value)} type={showSenha ? 'text' : 'password'} placeholder="Min. 6 caracteres"
                      style={{ width: '100%', padding: '9px 30px 9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
                    <button onClick={() => setShowSenha(!showSenha)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showSenha ? <EyeOff size={13} color="var(--text-muted)" /> : <Eye size={13} color="var(--text-muted)" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tipo de acesso</label>
                  <select value={novoRole} onChange={e => setNovoRole(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxSizing: 'border-box', background: 'white' }}>
                    <option value="admin">Administrador</option>
                    <option value="vendedora">Vendedora</option>
                    <option value="direcao">Direção Comercial</option>
                  </select>
                </div>
              </div>

              {novoRole === 'vendedora' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Vincular à vendedora</label>
                  <select value={novoVendedoraId || ''} onChange={e => setNovoVendedoraId(Number(e.target.value) || null)}
                    style={{ width: '100%', maxWidth: 300, padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxSizing: 'border-box', background: 'white' }}>
                    <option value="">Selecione uma vendedora...</option>
                    {vendedoras.map(v => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={criarUsuario} disabled={criandoUser || !novoEmail || !novoSenha}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', border: 'none', borderRadius: 8, background: criandoUser ? '#ccc' : '#16a34a', color: 'white', fontSize: 12, fontWeight: 700, cursor: criandoUser ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat' }}>
                  <Check size={12} /> {criandoUser ? 'Criando...' : 'Criar Usuário'}
                </button>
                <button onClick={() => setShowFormUser(false)}
                  style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: 'var(--text)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabela de usuários */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 150px 100px 120px', padding: '10px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', gap: 8 }}>
              <span>Email</span><span>Tipo</span><span>Vendedora</span><span>Status</span><span>Criado em</span>
            </div>
            {usuarios.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Nenhum usuário registrado no user_roles</div>
            ) : (
              usuarios.map((u, i) => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 120px 150px 100px 120px', padding: '12px 20px', borderBottom: i < usuarios.length - 1 ? '1px solid var(--border)' : 'none', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{u.email}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: roleColor[u.role]?.bg || '#f3f4f6', color: roleColor[u.role]?.color || '#6b7280', textAlign: 'center' }}>
                    {roleLabel[u.role] || u.role}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.vendedora_nome || '—'}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: u.ativo ? '#16a34a' : '#dc2626' }}>
                    {u.ativo ? '● Ativo' : '● Inativo'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.created_at ? fmtData(u.created_at) : '—'}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ══════ ABA TEMPLATES ══════ */}
      {abaAtiva === 'templates' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>Templates de Mensagem ({templates.length})</span>
            <button onClick={() => { setShowFormTemplate(true); setEditTemplateId(null); setTplAtalho(''); setTplNome(''); setTplConteudo(''); setTplCategoria('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: 'none', borderRadius: 8, background: 'var(--vinho)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat' }}>
              <Plus size={12} /> Novo Template
            </button>
          </div>

          {/* Form template */}
          {showFormTemplate && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', margin: '0 0 14px' }}>
                {editTemplateId ? 'Editar Template' : 'Novo Template'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Atalho (sem /)</label>
                  <input value={tplAtalho} onChange={e => setTplAtalho(e.target.value)} placeholder="saudacao"
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nome</label>
                  <input value={tplNome} onChange={e => setTplNome(e.target.value)} placeholder="Saudação inicial"
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Categoria</label>
                  <select value={tplCategoria} onChange={e => setTplCategoria(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxSizing: 'border-box', background: 'white' }}>
                    <option value="">Selecione...</option>
                    <option value="geral">Geral</option>
                    <option value="vendas">Vendas</option>
                    <option value="atendimento">Atendimento</option>
                    <option value="marketing">Marketing</option>
                    <option value="relacionamento">Relacionamento</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Conteúdo (use {'{nome}'}, {'{link}'}, {'{link_catalogo}'} como variáveis)
                </label>
                <textarea value={tplConteudo} onChange={e => setTplConteudo(e.target.value)}
                  placeholder="Oi, {nome}! Como posso te ajudar?"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={salvarTemplate} disabled={!tplAtalho || !tplNome || !tplConteudo}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', border: 'none', borderRadius: 8, background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat' }}>
                  <Save size={12} /> Salvar
                </button>
                <button onClick={() => { setShowFormTemplate(false); setEditTemplateId(null) }}
                  style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: 'var(--text)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de templates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map(t => (
              <div key={t.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px',
                opacity: t.ativo ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--vinho)' }}>/{t.atalho}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t.nome}</span>
                    {t.categoria && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: 'var(--bg)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {t.categoria}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => editarTemplate(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Edit3 size={13} color="var(--text-muted)" />
                    </button>
                    <button onClick={() => toggleTemplate(t.id, t.ativo)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      {t.ativo ? <EyeOff size={13} color="var(--text-muted)" /> : <Eye size={13} color="#16a34a" />}
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{t.conteudo}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════ ABA METAS & COMISSÕES ══════ */}
      {abaAtiva === 'metas' && (
        <>
          {/* Comissão por vendedora */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>Percentual de Comissão por Vendedora</span>
              <button onClick={exportarComissoes}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: 'var(--text)' }}>
                <Download size={12} /> Exportar CSV
              </button>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {comissoesConfig.map((v, i) => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px',
                  borderBottom: i < comissoesConfig.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{v.nome}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {editComissaoId === v.id ? (
                      <>
                        <input value={editComissaoVal} onChange={e => setEditComissaoVal(e.target.value)} type="number" step="0.5" min="0" max="100"
                          style={{ width: 60, padding: '4px 8px', border: '1px solid var(--vinho)', borderRadius: 4, fontSize: 12, fontWeight: 700, textAlign: 'center' }}
                          autoFocus onKeyDown={e => e.key === 'Enter' && salvarComissao(v.id)} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                        <button onClick={() => salvarComissao(v.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Check size={14} color="#16a34a" />
                        </button>
                        <button onClick={() => setEditComissaoId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X size={14} color="#dc2626" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)' }}>{Number(v.meta_percentual_comissao)}%</span>
                        <button onClick={() => { setEditComissaoId(v.id); setEditComissaoVal(String(v.meta_percentual_comissao)) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Edit3 size={13} color="var(--text-muted)" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de metas */}
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--azul)', display: 'block', marginBottom: 12 }}>Histórico de Metas por Mês</span>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 120px 120px 100px 120px', padding: '10px 18px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', gap: 8 }}>
                <span>Mês</span><span>Meta Geral</span><span>Meta Mínima</span><span>Status</span><span>Criada em</span>
              </div>
              {metasHistorico.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Nenhuma meta registrada</div>
              ) : (
                metasHistorico.map((m, i) => (
                  <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '100px 120px 120px 100px 120px', padding: '10px 18px', borderBottom: i < metasHistorico.length - 1 ? '1px solid var(--border)' : 'none', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>{m.mes_ref}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{fmtMoeda(Number(m.meta_geral))}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtMoeda(Number(m.meta_minima))}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, textAlign: 'center',
                      background: m.status === 'ativa' ? '#dcfce7' : m.status === 'aprovada' ? '#dbeafe' : '#f3f4f6',
                      color: m.status === 'ativa' ? '#16a34a' : m.status === 'aprovada' ? '#2563eb' : '#6b7280',
                    }}>
                      {m.status}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtData(m.criada_em)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════ ABA INTEGRAÇÕES ══════ */}
      {abaAtiva === 'integracoes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            {
              nome: 'Tiny ERP',
              desc: 'Sincronização de pedidos e clientes',
              status: 'ativo',
              detalhes: 'Webhook ativo · Sync a cada 30min via n8n',
              icon: '📦',
            },
            {
              nome: 'Mari SDR (WhatsApp)',
              desc: 'Agente de atendimento via Evolution API',
              status: 'ativo',
              detalhes: 'Cloud API · Webhook Railway',
              icon: '🤖',
            },
            {
              nome: 'Nuvemshop',
              desc: 'E-commerce · Produtos e estoque',
              status: 'ativo',
              detalhes: `Store ID: 7344725 · Sync via API`,
              icon: '🛍️',
            },
            {
              nome: 'WBuy',
              desc: 'Plataforma legada · Produtos',
              status: 'ativo',
              detalhes: '106 produtos importados',
              icon: '🛒',
            },
            {
              nome: 'n8n (Railway)',
              desc: 'Automações e workflows',
              status: 'ativo',
              detalhes: 'g3space-n8n.up.railway.app',
              icon: '⚡',
            },
            {
              nome: 'Resend (Email)',
              desc: 'Disparo de email marketing',
              status: 'configurar',
              detalhes: 'API key configurada no Sistema 3',
              icon: '📧',
            },
          ].map(integ => (
            <div key={integ.nome} style={{
              background: 'var(--surface)', border: `1px solid ${integ.status === 'configurar' ? '#fde047' : 'var(--border)'}`,
              borderRadius: 14, padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{integ.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)' }}>{integ.nome}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {integ.status === 'ativo' ? <Wifi size={12} color="#16a34a" /> : <WifiOff size={12} color="#d97706" />}
                  <span style={{ fontSize: 10, fontWeight: 700, color: integ.status === 'ativo' ? '#16a34a' : '#d97706' }}>
                    {integ.status === 'ativo' ? 'CONECTADO' : 'CONFIGURAR'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text)', margin: '0 0 4px' }}>{integ.desc}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{integ.detalhes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

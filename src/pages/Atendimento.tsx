import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useDark } from '../hooks/useDark'
import {
  MessageCircle, Search, Send, Bot, User as UserIcon,
  Phone, ArrowRightLeft, AlertTriangle, CheckCircle,
  FileText, Clock, Plus, X, Paperclip,
} from 'lucide-react'

/* ─── TYPES ─── */
interface Mensagem {
  id: number
  cliente_id: number | null
  telefone: string
  direcao: string      // 'entrada' | 'saida'
  mensagem: string | null
  tipo: string         // 'texto' | 'imagem' | etc
  atendente: string    // 'mari' | vendedora
  atendida_por: string | null
  transferida_para: number | null
  cliente_reativado: boolean
  created_at: string
}

interface Conversa {
  telefone: string
  cliente_id: number | null
  cliente_nome: string
  ultima_msg: string
  ultima_data: string
  atendente: string
  nao_lida: boolean
  total_msgs: number
  status: 'resolvido' | 'aguardando' | 'urgente'
}

interface Cliente {
  id: number
  nome: string
  telefone: string | null
  email: string | null
  status: string
  total_gasto: number
  total_pedidos: number
  ultimo_pedido: string | null
  vendedora_nome: string | null
}

interface Pedido {
  id: number
  tiny_id: number | null
  data_pedido: string
  valor_total: number
  status: string
}

interface Template {
  id: string
  atalho: string
  nome: string
  conteudo: string
  categoria: string | null
}

interface Nota {
  id: string
  nota: string
  criado_por: string | null
  created_at: string
}

/* ─── HELPERS ─── */
function fmtHora(d: string) {
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
function fmtDataFull(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
const CORES_AVATAR = ['#8E2753', '#0E2955', '#7c3aed', '#0e7490', '#16a34a', '#d97706', '#dc2626', '#6366f1']
function corAvatar(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length]
}

/* ─── COMPONENT ─── */
export default function Atendimento() {
  const dark = useDark()
  // State
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [selecionada, setSelecionada] = useState<string | null>(null) // telefone
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'aguardando' | 'urgente'>('todos')
  const [inputMsg, setInputMsg] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [abaDetalhe, setAbaDetalhe] = useState<'detalhes' | 'historico' | 'notas'>('detalhes')
  const [novaNota, setNovaNota] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  // Carregar conversas agrupadas
  useEffect(() => { carregarConversas(); carregarTemplates() }, [])

  async function carregarConversas() {
    setLoading(true)
    const { data: msgs } = await supabase
      .from('conversas')
      .select('id, cliente_id, telefone, direcao, mensagem, tipo, atendente, atendida_por, created_at')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (!msgs) { setLoading(false); return }

    // Buscar nomes dos clientes
    const clienteIds = [...new Set(msgs.filter(m => m.cliente_id).map(m => m.cliente_id!))]
    let clienteMap: Record<number, string> = {}
    if (clienteIds.length > 0) {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', clienteIds.slice(0, 500))
      for (const c of clientes || []) clienteMap[c.id] = c.nome
    }

    // Agrupar por telefone
    const grupoMap: Record<string, Mensagem[]> = {}
    for (const m of msgs) {
      if (!grupoMap[m.telefone]) grupoMap[m.telefone] = []
      grupoMap[m.telefone].push(m as Mensagem)
    }

    const lista: Conversa[] = Object.entries(grupoMap).map(([telefone, msgs]) => {
      const ultima = msgs[0] // já ordenado desc
      const clienteId = msgs.find(m => m.cliente_id)?.cliente_id || null
      const nome = clienteId && clienteMap[clienteId] ? clienteMap[clienteId] : telefone

      // Determinar status
      const ultimaEntrada = msgs.find(m => m.direcao === 'entrada')
      const ultimaSaida = msgs.find(m => m.direcao === 'saida')
      let status: 'resolvido' | 'aguardando' | 'urgente' = 'resolvido'

      if (ultimaEntrada && (!ultimaSaida || new Date(ultimaEntrada.created_at) > new Date(ultimaSaida.created_at))) {
        const horasSemResposta = (Date.now() - new Date(ultimaEntrada.created_at).getTime()) / (1000 * 60 * 60)
        status = horasSemResposta > 48 ? 'urgente' : 'aguardando'
      }

      return {
        telefone,
        cliente_id: clienteId,
        cliente_nome: nome,
        ultima_msg: ultima.mensagem?.slice(0, 50) || '(sem conteúdo)',
        ultima_data: ultima.created_at,
        atendente: ultima.atendente || 'mari',
        nao_lida: status === 'aguardando' || status === 'urgente',
        total_msgs: msgs.length,
        status,
      }
    })

    // Ordenar: urgentes primeiro, depois aguardando, depois resolvido, por data
    lista.sort((a, b) => {
      const prioridade = { urgente: 0, aguardando: 1, resolvido: 2 }
      const diff = prioridade[a.status] - prioridade[b.status]
      if (diff !== 0) return diff
      return new Date(b.ultima_data).getTime() - new Date(a.ultima_data).getTime()
    })

    setConversas(lista)
    setLoading(false)
  }

  async function carregarTemplates() {
    const { data } = await supabase
      .from('templates_mensagem')
      .select('*')
      .eq('ativo', true)
      .order('categoria')
    setTemplates((data || []) as Template[])
  }

  // Quando seleciona conversa
  async function selecionarConversa(telefone: string) {
    setSelecionada(telefone)
    setAbaDetalhe('detalhes')

    // Carregar mensagens
    const { data: msgs } = await supabase
      .from('conversas')
      .select('*')
      .eq('telefone', telefone)
      .order('created_at', { ascending: true })
    setMensagens((msgs || []) as Mensagem[])

    // Scroll para baixo
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 100)

    // Carregar dados do cliente
    const conversa = conversas.find(c => c.telefone === telefone)
    if (conversa?.cliente_id) {
      const { data: cli } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email, status')
        .eq('id', conversa.cliente_id)
        .single()

      if (cli) {
        // Buscar pedidos e totais
        const { data: peds } = await supabase
          .from('pedidos')
          .select('id, tiny_id, data_pedido, valor_total, status')
          .eq('cliente_id', cli.id)
          .order('data_pedido', { ascending: false })

        const pedidosList = (peds || []) as Pedido[]
        const totalGasto = pedidosList.reduce((s, p) => s + (Number(p.valor_total) || 0), 0)

        // Buscar vendedora
        const { data: ultimoPedido } = await supabase
          .from('pedidos')
          .select('vendedor_nome')
          .eq('cliente_id', cli.id)
          .order('data_pedido', { ascending: false })
          .limit(1)
          .maybeSingle()

        setCliente({
          ...cli,
          total_gasto: totalGasto,
          total_pedidos: pedidosList.length,
          ultimo_pedido: pedidosList[0]?.data_pedido || null,
          vendedora_nome: ultimoPedido?.vendedor_nome || null,
        })
        setPedidos(pedidosList)

        // Carregar notas
        const { data: notasData } = await supabase
          .from('notas_cliente')
          .select('*')
          .eq('cliente_id', cli.id)
          .order('created_at', { ascending: false })
        setNotas((notasData || []) as Nota[])
      }
    } else {
      setCliente(null)
      setPedidos([])
      setNotas([])
    }
  }

  // Enviar mensagem (simula — a real seria via Evolution API/WhatsApp)
  async function enviarMensagem() {
    if (!inputMsg.trim() || !selecionada) return

    const conversa = conversas.find(c => c.telefone === selecionada)

    await supabase.from('conversas').insert({
      telefone: selecionada,
      cliente_id: conversa?.cliente_id || null,
      direcao: 'saida',
      mensagem: inputMsg.trim(),
      tipo: 'texto',
      atendente: 'humano',
      atendida_por: 'humano',
    })

    setInputMsg('')
    setShowTemplates(false)

    // Recarregar mensagens
    const { data: msgs } = await supabase
      .from('conversas')
      .select('*')
      .eq('telefone', selecionada)
      .order('created_at', { ascending: true })
    setMensagens((msgs || []) as Mensagem[])

    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 100)
  }

  // Inserir template
  function usarTemplate(t: Template) {
    const conteudo = cliente
      ? t.conteudo.replace('{nome}', cliente.nome.split(' ')[0])
      : t.conteudo
    setInputMsg(conteudo)
    setShowTemplates(false)
  }

  // Adicionar nota
  async function adicionarNota() {
    if (!novaNota.trim() || !cliente) return
    await supabase.from('notas_cliente').insert({
      cliente_id: cliente.id,
      nota: novaNota.trim(),
      criado_por: 'equipe',
    })
    setNovaNota('')
    const { data } = await supabase
      .from('notas_cliente')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
    setNotas((data || []) as Nota[])
  }

  // Filtrar conversas
  const conversasFiltradas = useMemo(() => {
    return conversas.filter(c => {
      if (filtro === 'aguardando' && c.status !== 'aguardando') return false
      if (filtro === 'urgente' && c.status !== 'urgente') return false
      if (search) {
        const s = search.toLowerCase()
        return c.cliente_nome.toLowerCase().includes(s) || c.telefone.includes(s)
      }
      return true
    })
  }, [conversas, filtro, search])

  // Agrupar mensagens por data
  const mensagensAgrupadas = useMemo(() => {
    const grupos: { data: string; msgs: Mensagem[] }[] = []
    let dataAtual = ''
    for (const m of mensagens) {
      const d = fmtData(m.created_at)
      if (d !== dataAtual) {
        dataAtual = d
        grupos.push({ data: d, msgs: [] })
      }
      grupos[grupos.length - 1].msgs.push(m)
    }
    return grupos
  }, [mensagens])

  const statusColor = { resolvido: '#16a34a', aguardando: '#d97706', urgente: '#dc2626' }

  const conversaAtual = selecionada ? conversas.find(c => c.telefone === selecionada) : null

  // Handle input change - detect / for templates
  function handleInputChange(val: string) {
    setInputMsg(val)
    if (val === '/') {
      setShowTemplates(true)
    } else if (!val.startsWith('/')) {
      setShowTemplates(false)
    }
  }

  // ─── RENDER ───
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden' }}>

      {/* ══════ COLUNA ESQUERDA: Lista de conversas ══════ */}
      <div style={{
        width: 280, minWidth: 280, borderRight: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} color="var(--vinho)" />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)' }}>Atendimento</span>
            </div>
            {conversas.filter(c => c.nao_lida).length > 0 && (
              <span style={{
                background: 'var(--vinho)', color: 'white', fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 100, minWidth: 18, textAlign: 'center',
              }}>
                {conversas.filter(c => c.nao_lida).length}
              </span>
            )}
          </div>

          {/* Busca */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              style={{
                width: '100%', padding: '8px 10px 8px 30px', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 12, background: 'var(--bg)', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['todos', 'aguardando', 'urgente'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{
                  padding: '4px 10px', borderRadius: 100, border: 'none', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Montserrat',
                  background: filtro === f ? 'var(--vinho)' : 'var(--bg)',
                  color: filtro === f ? 'white' : 'var(--text-muted)',
                }}>
                {f === 'todos' ? 'Todos' : f === 'aguardando' ? 'Aguardando' : 'Urgente'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Carregando...</div>
          ) : conversasFiltradas.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Nenhuma conversa encontrada</div>
          ) : (
            conversasFiltradas.map(c => (
              <div
                key={c.telefone}
                onClick={() => selecionarConversa(c.telefone)}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: selecionada === c.telefone ? 'var(--vinho-light)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: corAvatar(c.cliente_nome),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 12, fontWeight: 700,
                  }}>
                    {iniciais(c.cliente_nome)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{
                        fontSize: 12, fontWeight: c.nao_lida ? 700 : 500, color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {c.cliente_nome}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {fmtHora(c.ultima_data)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{
                        fontSize: 11, color: c.nao_lida ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: c.nao_lida ? 600 : 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150,
                      }}>
                        {c.ultima_msg}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {c.atendente === 'mari' ? (
                          <Bot size={12} color="var(--text-light)" />
                        ) : (
                          <UserIcon size={12} color="var(--vinho)" />
                        )}
                        {c.nao_lida && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[c.status] }} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══════ COLUNA CENTRAL: Chat ══════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {!selecionada ? (
          // Estado vazio
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <MessageCircle size={48} color="var(--text-light)" />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
              Selecione uma conversa para começar
            </p>
          </div>
        ) : (
          <>
            {/* Header do chat */}
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: corAvatar(conversaAtual?.cliente_nome || ''),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 11, fontWeight: 700,
                }}>
                  {iniciais(conversaAtual?.cliente_nome || '?')}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    {conversaAtual?.cliente_nome}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    <Phone size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    {selecionada}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                  border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: 'var(--text)',
                }}>
                  <ArrowRightLeft size={12} /> Transferir
                </button>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                  border: dark ? '1px solid rgba(253,224,71,0.3)' : '1px solid #fde047', borderRadius: 8, background: dark ? 'rgba(253,224,71,0.1)' : '#fef9c3',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: dark ? '#fde047' : '#92400e',
                }}>
                  <AlertTriangle size={12} /> Urgente
                </button>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                  border: 'none', borderRadius: 8, background: 'var(--success)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', color: 'white',
                }}>
                  <CheckCircle size={12} /> Resolver
                </button>
              </div>
            </div>

            {/* Banner Mari */}
            {conversaAtual?.atendente === 'mari' && (
              <div style={{
                padding: '8px 20px', background: dark ? 'rgba(253,224,71,0.1)' : '#fef9c3', borderBottom: dark ? '1px solid rgba(253,224,71,0.3)' : '1px solid #fde047',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bot size={14} color={dark ? '#fde047' : '#92400e'} />
                  <span style={{ fontSize: 12, color: dark ? '#fde047' : '#92400e', fontWeight: 600 }}>
                    Mari está atendendo — clique em "Assumir" para responder você
                  </span>
                </div>
                <button style={{
                  padding: '4px 12px', borderRadius: 6, border: dark ? '1px solid rgba(217,119,6,0.4)' : '1px solid #d97706',
                  background: 'var(--surface)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Montserrat', color: dark ? '#fde047' : '#92400e',
                }}>
                  Assumir conversa
                </button>
              </div>
            )}

            {/* Mensagens */}
            <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {mensagensAgrupadas.map(grupo => (
                <div key={grupo.data}>
                  {/* Separador de data */}
                  <div style={{
                    textAlign: 'center', margin: '16px 0 12px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                      {grupo.data}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>

                  {grupo.msgs.map(m => {
                    const isSaida = m.direcao === 'saida'
                    const isMari = m.atendente === 'mari' && isSaida
                    const isHumano = m.atendente !== 'mari' && isSaida

                    return (
                      <div key={m.id} style={{
                        display: 'flex', justifyContent: isSaida ? 'flex-end' : 'flex-start',
                        marginBottom: 6,
                      }}>
                        <div style={{
                          maxWidth: '65%', padding: '10px 14px', borderRadius: 12,
                          background: isMari ? (dark ? 'rgba(124,58,237,0.15)' : '#F0EDF5') : isHumano ? (dark ? 'rgba(99,102,241,0.15)' : '#EEEDFE') : 'var(--surface)',
                          border: !isSaida ? '1px solid var(--border)' : 'none',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                          {/* Label de quem enviou */}
                          {isSaida && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                              {isMari ? <Bot size={10} color="#7c3aed" /> : <UserIcon size={10} color="var(--vinho)" />}
                              <span style={{ fontSize: 10, fontWeight: 600, color: isMari ? '#7c3aed' : 'var(--vinho)' }}>
                                {isMari ? 'Mari' : 'Você'}
                              </span>
                            </div>
                          )}

                          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {m.mensagem || '(sem conteúdo)'}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'right' }}>
                            {fmtHora(m.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Input de mensagem */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)',
              position: 'relative',
            }}>
              {/* Templates dropdown */}
              {showTemplates && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 20, right: 20,
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', maxHeight: 240, overflow: 'auto',
                  marginBottom: 4,
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)' }}>Templates rápidos</span>
                    <button onClick={() => setShowTemplates(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={14} color="var(--text-muted)" />
                    </button>
                  </div>
                  {templates.map(t => (
                    <div
                      key={t.id}
                      onClick={() => usarTemplate(t)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--vinho)', fontWeight: 700 }}>/{t.atalho}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {t.nome}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text)', margin: '3px 0 0', lineHeight: 1.4 }}>
                        {t.conteudo.slice(0, 80)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
                }}>
                  <Paperclip size={16} color="var(--text-muted)" />
                </button>
                <input
                  value={inputMsg}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  placeholder="Digite / para templates..."
                  style={{
                    flex: 1, padding: '10px 14px', border: '1px solid var(--border)',
                    borderRadius: 10, fontSize: 13, background: 'var(--bg)', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={enviarMensagem}
                  disabled={!inputMsg.trim()}
                  style={{
                    width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
                    background: inputMsg.trim() ? 'var(--vinho)' : 'var(--border)',
                    cursor: inputMsg.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Send size={16} color="white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══════ COLUNA DIREITA: Detalhes do cliente ══════ */}
      {selecionada && (
        <div style={{
          width: 300, minWidth: 300, borderLeft: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'auto',
        }}>
          {/* Abas */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
          }}>
            {(['detalhes', 'historico', 'notas'] as const).map(aba => (
              <button
                key={aba}
                onClick={() => setAbaDetalhe(aba)}
                style={{
                  flex: 1, padding: '12px 0', border: 'none', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Montserrat',
                  background: abaDetalhe === aba ? 'var(--surface)' : 'var(--bg)',
                  color: abaDetalhe === aba ? 'var(--vinho)' : 'var(--text-muted)',
                  borderBottom: abaDetalhe === aba ? '2px solid var(--vinho)' : '2px solid transparent',
                }}
              >
                {aba === 'detalhes' ? 'Detalhes' : aba === 'historico' ? 'Histórico' : 'Notas'}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {/* ─── ABA DETALHES ─── */}
            {abaDetalhe === 'detalhes' && (
              <>
                {cliente ? (
                  <>
                    {/* Avatar + Nome */}
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%', margin: '0 auto 8px',
                        background: corAvatar(cliente.nome),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 18, fontWeight: 700,
                      }}>
                        {iniciais(cliente.nome)}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{cliente.nome}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, marginTop: 4, display: 'inline-block',
                        background: cliente.status === 'ativo' ? (dark ? 'rgba(22,163,106,0.15)' : '#dcfce7') : cliente.status === 'esfriando' ? (dark ? 'rgba(217,119,6,0.15)' : '#fef9c3') : (dark ? 'rgba(220,38,38,0.15)' : '#fee2e2'),
                        color: cliente.status === 'ativo' ? '#16a34a' : cliente.status === 'esfriando' ? '#d97706' : '#dc2626',
                      }}>
                        {cliente.status?.toUpperCase() || 'N/A'}
                      </span>
                    </div>

                    {/* Contato */}
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Phone size={11} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>{cliente.telefone || selecionada}</span>
                      </div>
                      {cliente.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>✉</span>
                          <span style={{ fontSize: 12, color: 'var(--text)' }}>{cliente.email}</span>
                        </div>
                      )}
                    </div>

                    {/* LTV */}
                    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 12 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase' }}>Lifetime Value</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--azul)', margin: 0 }}>{fmtMoeda(cliente.total_gasto)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        em {cliente.total_pedidos} pedido{cliente.total_pedidos !== 1 ? 's' : ''}
                        {cliente.total_pedidos > 0 && ` · Ticket médio ${fmtMoeda(cliente.total_gasto / cliente.total_pedidos)}`}
                      </p>
                    </div>

                    {/* Vendedora */}
                    {cliente.vendedora_nome && (
                      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase' }}>Vendedora responsável</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{cliente.vendedora_nome}</p>
                      </div>
                    )}

                    {/* Último pedido */}
                    {pedidos.length > 0 && (
                      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 8px', textTransform: 'uppercase' }}>Último pedido</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                              #{pedidos[0].tiny_id || pedidos[0].id}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                              {fmtDataFull(pedidos[0].data_pedido)}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>
                              {fmtMoeda(Number(pedidos[0].valor_total))}
                            </p>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 100,
                              background: pedidos[0].status === 'Aprovado' ? (dark ? 'rgba(22,163,106,0.15)' : '#dcfce7') : (dark ? 'rgba(217,119,6,0.15)' : '#fef9c3'),
                              color: pedidos[0].status === 'Aprovado' ? '#16a34a' : '#d97706',
                            }}>
                              {pedidos[0].status}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <UserIcon size={32} color="var(--text-light)" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      Cliente não identificado
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Telefone: {selecionada}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ─── ABA HISTÓRICO ─── */}
            {abaDetalhe === 'historico' && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)', margin: '0 0 12px' }}>
                  Histórico de Pedidos ({pedidos.length})
                </p>
                {pedidos.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Nenhum pedido encontrado
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {pedidos.map((p, i) => (
                      <div key={p.id} style={{
                        padding: '10px 0',
                        borderBottom: i < pedidos.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                              Pedido #{p.tiny_id || p.id}
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                              <Clock size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                              {fmtDataFull(p.data_pedido)}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>
                              {fmtMoeda(Number(p.valor_total))}
                            </p>
                            <span style={{
                              fontSize: 9, fontWeight: 600,
                              color: p.status === 'Aprovado' ? '#16a34a' : '#d97706',
                            }}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ─── ABA NOTAS ─── */}
            {abaDetalhe === 'notas' && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--azul)', margin: '0 0 12px' }}>
                  Notas Internas
                </p>

                {/* Nova nota */}
                <div style={{ marginBottom: 16 }}>
                  <textarea
                    value={novaNota}
                    onChange={e => setNovaNota(e.target.value)}
                    placeholder="Adicionar nota sobre este cliente..."
                    style={{
                      width: '100%', padding: '10px', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12, resize: 'vertical', minHeight: 60,
                      boxSizing: 'border-box', background: 'var(--bg)',
                    }}
                  />
                  <button
                    onClick={adicionarNota}
                    disabled={!novaNota.trim() || !cliente}
                    style={{
                      marginTop: 6, padding: '6px 14px', borderRadius: 6, border: 'none',
                      background: novaNota.trim() && cliente ? 'var(--vinho)' : 'var(--border)',
                      color: 'white', fontSize: 11, fontWeight: 700, cursor: novaNota.trim() && cliente ? 'pointer' : 'not-allowed',
                      fontFamily: 'Montserrat', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Plus size={12} /> Adicionar nota
                  </button>
                </div>

                {/* Lista de notas */}
                {notas.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    <FileText size={20} color="var(--text-light)" style={{ display: 'block', margin: '0 auto 6px' }} />
                    Nenhuma nota registrada
                  </p>
                ) : (
                  notas.map((n, i) => (
                    <div key={n.id} style={{
                      padding: '10px 0',
                      borderBottom: i < notas.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{n.nota}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {n.criado_por || 'Equipe'} · {fmtDataFull(n.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

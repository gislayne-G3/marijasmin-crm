import { useState } from 'react'
import { RefreshCw, Package, ShoppingCart, CheckCircle2, AlertCircle, Clock, Store, Download } from 'lucide-react'

interface SyncResult {
  ok: boolean
  atualizados?: number
  variacoes_atualizadas?: number
  importados?: number
  erros: number
  errosList?: string[]
  skus_mapeados?: number
  produtos_processados?: number
  msg?: string
}

interface SyncLog {
  tipo: string
  result: SyncResult
  timestamp: string
}

export default function Sincronizacao() {
  const [loadingEstoque, setLoadingEstoque] = useState(false)
  const [loadingEstoqueNS, setLoadingEstoqueNS] = useState(false)
  const [loadingImportNovos, setLoadingImportNovos] = useState(false)
  const [loadingPedidos, setLoadingPedidos] = useState(false)
  const [paginaInicio, setPaginaInicio] = useState(1)
  const [paginaFim, setPaginaFim] = useState(10)
  const [logs, setLogs] = useState<SyncLog[]>([])

  async function importarNovos() {
    setLoadingImportNovos(true)
    try {
      const res = await fetch('/api/nuvemshop-import-novos', { method: 'POST' })
      const result: SyncResult = await res.json()
      setLogs(prev => [{ tipo: 'Novos Produtos', result, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    } catch (e) {
      setLogs(prev => [{ tipo: 'Novos Produtos', result: { ok: false, erros: 1, errosList: [String(e)] }, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    }
    setLoadingImportNovos(false)
  }

  async function syncEstoqueNuvemshop() {
    setLoadingEstoqueNS(true)
    try {
      const res = await fetch('/api/nuvemshop-sync-estoque', { method: 'POST' })
      const result: SyncResult = await res.json()
      setLogs(prev => [{ tipo: 'Estoque Nuvemshop', result, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    } catch (e) {
      setLogs(prev => [{ tipo: 'Estoque Nuvemshop', result: { ok: false, erros: 1, errosList: [String(e)] }, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    }
    setLoadingEstoqueNS(false)
  }

  async function syncEstoque() {
    setLoadingEstoque(true)
    try {
      const res = await fetch('/api/tiny-sync-estoque', { method: 'POST' })
      const result: SyncResult = await res.json()
      setLogs(prev => [{ tipo: 'Estoque', result, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    } catch (e) {
      setLogs(prev => [{ tipo: 'Estoque', result: { ok: false, erros: 1, errosList: [String(e)] }, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    }
    setLoadingEstoque(false)
  }

  async function syncPedidos() {
    setLoadingPedidos(true)
    try {
      const res = await fetch('/api/tiny-sync-pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagina_inicio: paginaInicio, pagina_fim: paginaFim }),
      })
      const result: SyncResult = await res.json()
      setLogs(prev => [{ tipo: 'Pedidos', result, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    } catch (e) {
      setLogs(prev => [{ tipo: 'Pedidos', result: { ok: false, erros: 1, errosList: [String(e)] }, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev])
    }
    setLoadingPedidos(false)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 780 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Sincronização Tiny ERP</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Sincronize estoque e pedidos do Tiny com o Supabase
        </p>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>

        {/* Card Importar Novos Produtos */}
        <div style={{ background: '#e8f0fe', border: '1px solid #b8d0f8', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--azul)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Download size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul)', margin: 0 }}>Importar Novos Produtos da Nuvemshop</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px', lineHeight: 1.5 }}>
                Detecta produtos cadastrados na Nuvemshop que ainda <strong>não estão no PIM</strong> e os importa automaticamente com cores, variações e estoque.
                Produtos já existentes não são alterados.
              </p>
              <button
                onClick={importarNovos}
                disabled={loadingImportNovos}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: loadingImportNovos ? 'var(--border)' : 'var(--azul)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: loadingImportNovos ? 'not-allowed' : 'pointer',
                  fontFamily: 'Montserrat',
                }}
              >
                <Download size={14} style={{ animation: loadingImportNovos ? 'spin 1s linear infinite' : 'none' }} />
                {loadingImportNovos ? 'Verificando produtos novos...' : 'Importar Novos Produtos'}
              </button>
            </div>
          </div>
        </div>

        {/* Card Estoque Nuvemshop — PRINCIPAL */}
        <div style={{ background: 'var(--surface)', border: '2px solid var(--vinho)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--vinho-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Store size={20} color="var(--vinho)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Sync Estoque — Nuvemshop</h2>
                <span style={{ fontSize: 10, background: 'var(--vinho)', color: 'white', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>RECOMENDADO</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px', lineHeight: 1.5 }}>
                Atualiza o estoque de cada variação (cor × tamanho) usando o <strong>nuvemshop_variant_id</strong> — a forma mais precisa. Processa os 98 produtos ativos. Leva ~3 min.
              </p>
              <button
                onClick={syncEstoqueNuvemshop}
                disabled={loadingEstoqueNS}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: loadingEstoqueNS ? 'var(--border)' : 'var(--vinho)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: loadingEstoqueNS ? 'not-allowed' : 'pointer',
                  fontFamily: 'Montserrat',
                }}
              >
                <RefreshCw size={14} style={{ animation: loadingEstoqueNS ? 'spin 1s linear infinite' : 'none' }} />
                {loadingEstoqueNS ? 'Sincronizando estoque...' : 'Sincronizar Estoque Nuvemshop'}
              </button>
            </div>
          </div>
        </div>

        {/* Card Estoque Tiny */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--vinho-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Package size={20} color="var(--vinho)" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Sync de Estoque</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px', lineHeight: 1.5 }}>
                Busca o estoque atual de cada variação no Tiny e atualiza o Supabase.
                Depois de sincronizar, o estoque no PIM estará atualizado.
              </p>
              <button
                onClick={syncEstoque}
                disabled={loadingEstoque}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: loadingEstoque ? 'var(--border)' : 'var(--vinho)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: loadingEstoque ? 'not-allowed' : 'pointer',
                  fontFamily: 'Montserrat',
                }}
              >
                <RefreshCw size={14} style={{ animation: loadingEstoque ? 'spin 1s linear infinite' : 'none' }} />
                {loadingEstoque ? 'Sincronizando...' : 'Sincronizar Estoque'}
              </button>
            </div>
          </div>
        </div>

        {/* Card Pedidos */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingCart size={20} color="var(--azul)" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Sync de Pedidos</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px', lineHeight: 1.5 }}>
                Importa pedidos do Tiny para o Supabase. O Tiny tem <strong>80 páginas</strong> (~8.000 pedidos).
                Sync em blocos de páginas para não exceder o limite da API.
              </p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Página início:</label>
                  <input
                    type="number" value={paginaInicio} min={1} max={80}
                    onChange={e => setPaginaInicio(Number(e.target.value))}
                    style={{ width: 60, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center', fontFamily: 'Montserrat' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Página fim:</label>
                  <input
                    type="number" value={paginaFim} min={1} max={80}
                    onChange={e => setPaginaFim(Number(e.target.value))}
                    style={{ width: 60, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'center', fontFamily: 'Montserrat' }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-light)', background: 'var(--bg)', padding: '4px 8px', borderRadius: 6 }}>
                  ~{(paginaFim - paginaInicio + 1) * 100} pedidos
                </span>
              </div>

              {/* Atalhos rápidos */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Últimos 1.000', inicio: 1, fim: 10 },
                  { label: 'Últimos 3.000', inicio: 1, fim: 30 },
                  { label: 'Todos (8.000)', inicio: 1, fim: 80 },
                ].map(({ label, inicio, fim }) => (
                  <button
                    key={label}
                    onClick={() => { setPaginaInicio(inicio); setPaginaFim(fim) }}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Montserrat',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={syncPedidos}
                disabled={loadingPedidos}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: loadingPedidos ? 'var(--border)' : 'var(--azul)',
                  color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: loadingPedidos ? 'not-allowed' : 'pointer',
                  fontFamily: 'Montserrat',
                }}
              >
                <RefreshCw size={14} style={{ animation: loadingPedidos ? 'spin 1s linear infinite' : 'none' }} />
                {loadingPedidos ? 'Importando pedidos...' : 'Importar Pedidos'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Histórico desta sessão
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--surface)', border: `1px solid ${log.result.ok ? 'var(--success)' : 'var(--warning)'}`,
                  borderRadius: 10, padding: '12px 16px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                {log.result.ok
                  ? <CheckCircle2 size={15} color="var(--success)" style={{ marginTop: 1, flexShrink: 0 }} />
                  : <AlertCircle size={15} color="var(--warning)" style={{ marginTop: 1, flexShrink: 0 }} />
                }
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sync {log.tipo}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} /> {log.timestamp}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {log.result.msg || (
                      <>
                        {log.result.importados !== undefined && `${log.result.importados} importados`}
                        {log.result.atualizados !== undefined && `${log.result.atualizados} atualizados`}
                        {log.result.variacoes_atualizadas !== undefined && `${log.result.variacoes_atualizadas} variações · ${log.result.produtos_processados || 0} produtos`}
                        {log.result.skus_mapeados !== undefined && ` · ${log.result.skus_mapeados} SKUs mapeados`}
                        {log.result.erros > 0 && ` · ${log.result.erros} erros`}
                      </>
                    )}
                  </p>
                  {(log.result.errosList || []).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--danger)' }}>
                      {log.result.errosList!.slice(0, 3).map((e, j) => <div key={j}>• {e}</div>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

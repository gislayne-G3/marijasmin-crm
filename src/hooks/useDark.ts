import { useEffect, useState } from 'react'

export function useDark() {
  const [dark, setDark] = useState(() => document.body.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.body.classList.contains('dark'))
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return dark
}

/* Status color maps for light / dark modes */
export const STATUS_CORES_LIGHT: Record<string, { color: string; bg: string }> = {
  aprovado:  { color: '#16a34a', bg: '#dcfce7' },
  faturado:  { color: '#0e7490', bg: '#cffafe' },
  enviado:   { color: '#7c3aed', bg: '#ede9fe' },
  entregue:  { color: '#15803d', bg: '#bbf7d0' },
  cancelado: { color: '#dc2626', bg: '#fee2e2' },
  pendente:  { color: '#d97706', bg: '#fef9c3' },
}

export const STATUS_CORES_DARK: Record<string, { color: string; bg: string }> = {
  aprovado:  { color: '#22d46a', bg: 'rgba(34,212,106,0.12)' },
  faturado:  { color: '#22d3ee', bg: 'rgba(14,116,144,0.12)' },
  enviado:   { color: '#a78bfa', bg: 'rgba(124,58,237,0.12)' },
  entregue:  { color: '#34d399', bg: 'rgba(21,128,61,0.12)' },
  cancelado: { color: '#f04848', bg: 'rgba(240,72,72,0.12)' },
  pendente:  { color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
}

export function useStatusCores() {
  const dark = useDark()
  return dark ? STATUS_CORES_DARK : STATUS_CORES_LIGHT
}

/* Client status colors */
export const CLIENT_STATUS_LIGHT: Record<string, string> = {
  ativo: '#16a34a', esfriando: '#d97706', inativo: '#6b7280', perdido: '#dc2626',
}
export const CLIENT_STATUS_DARK: Record<string, string> = {
  ativo: '#22d46a', esfriando: '#f5a623', inativo: '#6B6B8A', perdido: '#f04848',
}

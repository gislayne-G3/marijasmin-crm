import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  // Apply on mount
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark')
    }
  }, [])

  return (
    <button
      onClick={() => setDark(d => !d)}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        color: dark ? '#C44D8A' : 'rgba(255,255,255,0.45)',
        background: dark ? 'rgba(196,77,138,0.1)' : 'none',
        border: dark ? '1px solid rgba(196,77,138,0.3)' : '1px solid transparent',
        borderRadius: 8,
        cursor: 'pointer', fontSize: 12, fontFamily: 'Montserrat',
        padding: '7px 10px', width: '100%',
        transition: 'all 0.3s',
      }}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
      {dark ? 'Modo Claro' : 'Modo Escuro'}
    </button>
  )
}

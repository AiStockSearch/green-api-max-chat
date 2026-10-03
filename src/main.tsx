import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { PwaLayer } from './pwa/PwaLayer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PwaLayer />
  </StrictMode>,
)

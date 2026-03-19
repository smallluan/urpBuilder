import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/reset.less'
import './styles/theme.less'
import 'tdesign-react/dist/tdesign.min.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

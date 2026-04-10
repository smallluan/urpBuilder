import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/reset.less'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/500.css'
import '@fontsource/noto-serif-sc/700.css'
import './styles/theme.less'
import 'tdesign-react/dist/tdesign.min.css'
import './styles/app-theme-tokens.less'
import './styles/tdesign-overrides.less'
import App from './App.tsx'
import { applyColorModeToDocument, getResolvedColorMode } from './builder/theme/builderThemeStore'

applyColorModeToDocument(getResolvedColorMode())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

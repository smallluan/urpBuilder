import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ChangelogPage from './pages/Changelog';
import { applyColorModeToDocument, useBuilderThemeStore } from './builder/theme/builderThemeStore';
import './styles/reset.less';
import 'tdesign-react/dist/tdesign.min.css';
import './styles/app-theme-tokens.less';
import './styles/tdesign-overrides.less';
import './changelog-window.less';

function ChangelogWindowApp() {
  useEffect(() => {
    document.title = '更新日志 · URP Builder';
    applyColorModeToDocument(useBuilderThemeStore.getState().colorMode);
    const unsubHydrate = useBuilderThemeStore.persist.onFinishHydration(() => {
      applyColorModeToDocument(useBuilderThemeStore.getState().colorMode);
    });
    const unsub = useBuilderThemeStore.subscribe((state) => {
      applyColorModeToDocument(state.colorMode);
    });
    return () => {
      unsubHydrate();
      unsub();
    };
  }, []);

  return (
    <div className="changelog-window">
      <header className="changelog-window__bar">
        <span className="changelog-window__brand">URP Builder</span>
        <button type="button" className="changelog-window__close" onClick={() => window.close()}>
          关闭窗口
        </button>
      </header>
      <main className="changelog-window__main">
        <ChangelogPage />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChangelogWindowApp />
  </StrictMode>,
);

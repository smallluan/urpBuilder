import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import ApiAlertHost from './api/ApiAlertHost';
import { AuthProvider } from './auth/context';
import { TeamProvider } from './team/context';
import { applyColorModeToDocument, useBuilderThemeStore } from './builder/theme/builderThemeStore';

function App() {
  useEffect(() => {
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
    <AuthProvider>
      <TeamProvider>
        <RouterProvider router={router} />
      </TeamProvider>
      <ApiAlertHost />
    </AuthProvider>
  );
}

export default App;

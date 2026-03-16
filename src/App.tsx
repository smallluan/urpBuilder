import { RouterProvider } from 'react-router-dom';
import router from './router';
import ApiAlertHost from './api/ApiAlertHost';
import { AuthProvider } from './auth/context';
import { TeamProvider } from './team/context';

function App() {
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

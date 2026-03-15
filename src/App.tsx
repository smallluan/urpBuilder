import { RouterProvider } from 'react-router-dom';
import router from './router';
import ApiAlertHost from './api/ApiAlertHost';
import { AuthProvider } from './auth/context';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ApiAlertHost />
    </AuthProvider>
  );
}

export default App;

import { RouterProvider } from 'react-router-dom';
import router from './router';
import ApiAlertHost from './api/ApiAlertHost';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ApiAlertHost />
    </>
  );
}

export default App;

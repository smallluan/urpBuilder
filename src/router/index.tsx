import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/Layout';
import Home from '../pages/Home';
import BuildComponent from '../pages/BuildComponent';
import BuildPage from '../pages/BuildPage';
import DataApi from '../pages/DataApi';
import DataConstance from '../pages/DataConstance';
import CreateComponent from '../pages/CreateComponent';
import CreatePage from '../pages/CreatePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'build-component',
        element: <BuildComponent />,
      },
      {
        path: 'build-page',
        element: <BuildPage />,
      },
      {
        path: 'data-api',
        element: <DataApi />,
      },
      {
        path: 'data-constance',
        element: <DataConstance />,
      },
    ],
  },
  // standalone pages (no layout)
  {
    path: '/create-component',
    element: <CreateComponent />,
  },
  {
    path: '/create-page',
    element: <CreatePage />,
  },
]);

export default router;
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

const AppLayout = lazy(() => import('../components/Layout'));
const Home = lazy(() => import('../pages/Home'));
const BuildComponent = lazy(() => import('../pages/BuildComponent'));
const BuildPage = lazy(() => import('../pages/BuildPage'));
const DataApi = lazy(() => import('../pages/DataApi'));
const DataConstance = lazy(() => import('../pages/DataConstance'));
const CreateComponent = lazy(() => import('../pages/CreateComponent'));
const CreatePage = lazy(() => import('../pages/CreatePage'));
const PreviewEngine = lazy(() => import('../pages/PreviewEngine'));

const load = (el: React.ReactElement) => (
  <Suspense fallback={<div>加载中...</div>}>{el}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: load(<AppLayout />),
    children: [
      {
        index: true,
        element: load(<Home />),
      },
      {
        path: 'build-component',
        element: load(<BuildComponent />),
      },
      {
        path: 'build-page',
        element: load(<BuildPage />),
      },
      {
        path: 'data-api',
        element: load(<DataApi />),
      },
      {
        path: 'data-constance',
        element: load(<DataConstance />),
      },
    ],
  },
  // standalone pages (no layout)
  {
    path: '/create-component',
    element: load(<CreateComponent />),
  },
  {
    path: '/create-page',
    element: load(<CreatePage />),
  },
  {
    path: '/preview-engine',
    element: load(<PreviewEngine />),
  },
]);

export default router;
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PublicOnlyRoute, RequireAuth } from './guards';

const AppLayout = lazy(() => import('../components/Layout'));
const Home = lazy(() => import('../pages/Home'));
const BuildComponent = lazy(() => import('../pages/BuildComponent/index'));
const BuildPage = lazy(() => import('../pages/BuildPage/index'));
const DataApi = lazy(() => import('../pages/DataApi'));
const DataConstance = lazy(() => import('../pages/DataConstance'));
const Teams = lazy(() => import('../pages/Teams'));
const UserAdmin = lazy(() => import('../pages/UserAdmin'));
const TeamAdmin = lazy(() => import('../pages/TeamAdmin'));
const CreateComponent = lazy(() => import('../pages/CreateComponent'));
const CreatePage = lazy(() => import('../pages/CreatePage'));
const PreviewEngine = lazy(() => import('../pages/PreviewEngine'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));

const load = (el: React.ReactElement) => (
  <Suspense fallback={<div>加载中...</div>}>{el}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RequireAuth>{load(<AppLayout />)}</RequireAuth>,
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
      {
        path: 'teams',
        element: load(<Teams />),
      },
      {
        path: 'user-admin',
        element: load(<UserAdmin />),
      },
      {
        path: 'team-admin',
        element: load(<TeamAdmin />),
      },
    ],
  },
  // standalone pages (no layout)
  {
    path: '/login',
    element: <PublicOnlyRoute>{load(<Login />)}</PublicOnlyRoute>,
  },
  {
    path: '/register',
    element: <PublicOnlyRoute>{load(<Register />)}</PublicOnlyRoute>,
  },
  {
    path: '/create-component',
    element: <RequireAuth>{load(<CreateComponent />)}</RequireAuth>,
  },
  {
    path: '/create-page',
    element: <RequireAuth>{load(<CreatePage />)}</RequireAuth>,
  },
  {
    path: '/preview-engine',
    element: load(<PreviewEngine />),
  },
  {
    path: '/site-preview/*',
    element: load(<PreviewEngine />),
  },
]);

export default router;
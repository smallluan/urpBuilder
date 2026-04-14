import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Loading } from 'tdesign-react';
import { PublicOnlyRoute, RequireAuth } from './guards';
import DocumentTitleSync from '../components/DocumentTitleSync';

const AppLayout = lazy(() => import('../components/Layout'));
const Home = lazy(() => import('../pages/Home'));
const BuildComponent = lazy(() => import('../pages/BuildComponent/index'));
const BuildPage = lazy(() => import('../pages/BuildPage/index'));
const DataApi = lazy(() => import('../pages/DataApi'));
const DataConstance = lazy(() => import('../pages/DataConstance'));
const DataCloudFunction = lazy(() => import('../pages/DataCloudFunction'));
const DataAssets = lazy(() => import('../pages/DataAssets'));
const Teams = lazy(() => import('../pages/Teams'));
const UserAdmin = lazy(() => import('../pages/UserAdmin'));
const TeamAdmin = lazy(() => import('../pages/TeamAdmin'));
const CreateComponent = lazy(() => import('../pages/CreateComponent'));
const CreatePage = lazy(() => import('../pages/CreatePage'));
const ComponentVersionCatalog = lazy(() => import('../pages/ComponentVersionCatalog'));
const ComponentVersionCompare = lazy(() => import('../pages/ComponentVersionCompare'));
const PreviewEngine = lazy(() => import('../pages/PreviewEngine'));
const CodeWorkbench = lazy(() => import('../pages/CodeWorkbench/index.tsx'));
const AdminBroadcast = lazy(() => import('../pages/AdminBroadcast'));
const Login = lazy(() => import('../pages/Login'));
const DocsLayout = lazy(() => import('../pages/Docs/DocsLayout'));
const DocsWelcomePage = lazy(() => import('../pages/Docs/DocsWelcomePage'));
const DocsArticlePage = lazy(() => import('../pages/Docs/DocsArticlePage'));

const routeSuspenseFallback = (
  <Loading fullscreen loading preventScrollThrough showOverlay />
);

const load = (el: React.ReactElement) => <Suspense fallback={routeSuspenseFallback}>{el}</Suspense>;

const RootLayout = () => (
  <>
    <DocumentTitleSync />
    <Outlet />
  </>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
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
            path: 'data-cloud-function',
            element: load(<DataCloudFunction />),
          },
          {
            path: 'data-assets',
            element: load(<DataAssets />),
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
          {
            path: 'admin-broadcasts',
            element: load(<AdminBroadcast />),
          },
        ],
      },
      {
        element: <PublicOnlyRoute>{load(<Login />)}</PublicOnlyRoute>,
        children: [
          {
            path: '/login',
          },
          {
            path: '/register',
          },
        ],
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
        path: '/component-version-catalog',
        element: <RequireAuth>{load(<ComponentVersionCatalog />)}</RequireAuth>,
      },
      {
        path: '/component-version-compare',
        element: <RequireAuth>{load(<ComponentVersionCompare />)}</RequireAuth>,
      },
      {
        path: '/preview-engine',
        element: load(<PreviewEngine />),
      },
      {
        path: '/code-workbench',
        element: <RequireAuth>{load(<CodeWorkbench />)}</RequireAuth>,
      },
      {
        path: '/site-preview/*',
        element: load(<PreviewEngine />),
      },
      {
        path: '/help',
        element: <RequireAuth>{load(<DocsLayout />)}</RequireAuth>,
        children: [
          {
            index: true,
            element: load(<DocsWelcomePage />),
          },
          {
            path: 'doc/:sectionId/:slug',
            element: load(<DocsArticlePage />),
          },
        ],
      },
    ],
  },
]);

export default router;

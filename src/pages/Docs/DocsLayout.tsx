import { Outlet } from 'react-router-dom';
import DocsHeader from './DocsHeader';
import DocsSidebar from './DocsSidebar';
import '../../components/Layout/sidebar-surface.less';
import './docs.css';

export default function DocsLayout() {
  return (
    <div className="docs-shell">
      <DocsHeader />
      <div className="docs-body">
        <DocsSidebar />
        <main className="docs-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Layout } from 'tdesign-react';
import DocsSiteLogo from './DocsSiteLogo';
import { ThemeModeAnimatedToggle } from '../../components/ThemeModeAnimatedToggle';

const { Header } = Layout;

export default function DocsHeader() {
  return (
    <Header className="docs-top-header">
      <div className="docs-top-header__brand">
        <DocsSiteLogo className="docs-top-header__logo" />
      </div>
      <ThemeModeAnimatedToggle className="app-layout-theme-toggle" />
    </Header>
  );
}

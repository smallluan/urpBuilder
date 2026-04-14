import { Button } from 'tdesign-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faCompass,
  faDatabase,
  faHammer,
  faPeopleGroup,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useLocation, useNavigate } from 'react-router-dom';
import { SIDEBAR_NAV, docPath } from './nav';

const SECTION_ICONS: Record<string, IconDefinition> = {
  intro: faCompass,
  build: faHammer,
  data: faDatabase,
  advanced: faSliders,
  collab: faPeopleGroup,
  appendix: faBookOpen,
};

export default function DocsSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, '') || '/';

  return (
    <aside className="sidebar docs-sidebar" aria-label="文档目录">
      <div className="sidebar-flat-menu">
        {SIDEBAR_NAV.map((section) => (
          <div key={section.id} className="sidebar-section">
            <div className="sidebar-section__title docs-sidebar-section__title">
              <FontAwesomeIcon
                icon={SECTION_ICONS[section.id] ?? faBookOpen}
                className="docs-sidebar-section__icon"
                aria-hidden
              />
              <span>{section.title}</span>
            </div>
            <div className="sidebar-section__items">
              {section.items.map((item) => {
                const to = docPath(section.id, item.slug);
                const toNorm = to.replace(/\/$/, '') || '/';
                const active = path === toNorm || path.startsWith(`${toNorm}/`);
                return (
                  <Button
                    key={item.slug}
                    variant={active ? 'base' : 'text'}
                    theme="default"
                    className={`sidebar-menu-button${active ? ' is-active' : ''}`}
                    onClick={() => navigate(to)}
                  >
                    {item.title}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

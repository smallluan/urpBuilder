import React from 'react';
import { Button, Select, Tag } from 'tdesign-react';
import { AddIcon, SettingIcon } from 'tdesign-icons-react';
import { useBuilderContext } from '../../../builder/context/BuilderContext';
import type { UiTreeNode } from '../../../builder/store/types';

const collectRouteOutlets = (root: UiTreeNode | null | undefined): Array<{ key: string; label: string }> => {
  if (!root) {
    return [];
  }

  const result: Array<{ key: string; label: string }> = [];
  const visit = (node: UiTreeNode) => {
    if (node.type === 'RouteOutlet') {
      result.push({
        key: node.key,
        label: node.label || `路由出口(${node.key.slice(0, 8)})`,
      });
    }

    (node.children ?? []).forEach((child) => visit(child));
  };

  visit(root);
  return result;
};

const PageRouteToolbar: React.FC = () => {
  const { useStore } = useBuilderContext();
  const pageRoutes = useStore((state) => state.pageRoutes);
  const activePageRouteId = useStore((state) => state.activePageRouteId);
  const activeRouteOutletKey = useStore((state) => state.activeRouteOutletKey);
  const uiPageData = useStore((state) => state.uiPageData);
  const addPageRoute = useStore((state) => state.addPageRoute);
  const switchPageRoute = useStore((state) => state.switchPageRoute);
  const setActiveRouteOutletKey = useStore((state) => state.setActiveRouteOutletKey);

  const activeRoute = pageRoutes.find((item) => item.routeId === activePageRouteId) ?? null;
  const routeOutlets = React.useMemo(() => collectRouteOutlets(uiPageData), [uiPageData]);

  const handleCreateRoute = () => {
    const routeIdSet = new Set(pageRoutes.map((route) => route.routeId));
    const routePathSet = new Set(pageRoutes.map((route) => route.routeConfig.routePath.trim()).filter(Boolean));
    const routeNameSet = new Set(pageRoutes.map((route) => route.routeConfig.routeName.trim()).filter(Boolean));

    let routeIndex = pageRoutes.length + 1;
    let nextRouteId = `route-${routeIndex}`;
    while (routeIdSet.has(nextRouteId)) {
      routeIndex += 1;
      nextRouteId = `route-${routeIndex}`;
    }

    let nextRoutePath = routeIndex === 1 ? '/' : `/route-${routeIndex}`;
    while (routePathSet.has(nextRoutePath)) {
      routeIndex += 1;
      if (routeIdSet.has(`route-${routeIndex}`)) {
        continue;
      }
      nextRouteId = `route-${routeIndex}`;
      nextRoutePath = `/route-${routeIndex}`;
    }

    let nextRouteName = `route${routeIndex}`;
    while (routeNameSet.has(nextRouteName)) {
      routeIndex += 1;
      if (routeIdSet.has(`route-${routeIndex}`) || routePathSet.has(`/route-${routeIndex}`)) {
        continue;
      }
      nextRouteId = `route-${routeIndex}`;
      nextRoutePath = `/route-${routeIndex}`;
      nextRouteName = `route${routeIndex}`;
    }

    const createdRouteId = addPageRoute({
      routeId: nextRouteId,
      routeConfig: {
        routePath: nextRoutePath,
        routeName: nextRouteName,
        pageTitle: `路由 ${routeIndex}`,
        menuTitle: `路由 ${routeIndex}`,
        useLayout: true,
      },
    });
    switchPageRoute(createdRouteId);
  };

  const handleOpenRouteSettings = () => {
    window.dispatchEvent(new CustomEvent('builder:open-page-settings'));
  };

  return (
    <div className="page-route-toolbar">
      <Select
        className="page-route-toolbar__select"
        value={activePageRouteId ?? undefined}
        options={pageRoutes.map((route, index) => ({
          label: `${index === 0 ? '[默认] ' : ''}${route.routeConfig.menuTitle || route.routeConfig.pageTitle || route.routeConfig.routeName} · ${route.routeConfig.routePath || '/'}`,
          value: route.routeId,
        }))}
        onChange={(value) => switchPageRoute(String(value ?? ''))}
      />
      <Tag size="small" theme="primary" variant="light">{activeRoute?.routeConfig.routePath || '/'}</Tag>
      {routeOutlets.length > 0 ? (
        <Select
          className="page-route-toolbar__select"
          value={activeRouteOutletKey ?? undefined}
          options={routeOutlets.map((outlet) => ({
            label: outlet.label,
            value: outlet.key,
          }))}
          onChange={(value) => setActiveRouteOutletKey(String(value ?? ''))}
        />
      ) : null}
      <Button size="small" theme="default" variant="outline" icon={<SettingIcon />} onClick={handleOpenRouteSettings}>
        设置
      </Button>
      <Button size="small" theme="default" variant="outline" icon={<AddIcon />} onClick={handleCreateRoute}>
        新增
      </Button>
    </div>
  );
};

export default React.memo(PageRouteToolbar);

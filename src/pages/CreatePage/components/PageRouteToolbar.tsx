import React, { useState } from 'react';
import { Button, Dialog, Drawer, Input, Select, Switch } from 'tdesign-react';
import { AddIcon, SettingIcon } from 'tdesign-icons-react';
import { TopbarIconButton } from '../../../builder/components/UnifiedBuilderTopbar';
import { useBuilderContext } from '../../../builder/context/BuilderContext';
import type { UiTreeNode } from '../../../builder/store/types';
import { emitApiAlert } from '../../../api/alertBus';

type RouteConfigDraft = {
  routePath: string;
  routeName: string;
  pageTitle: string;
  menuTitle: string;
  useLayout: boolean;
};

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
  const pageRouteConfig = useStore((state) => state.pageRouteConfig);
  const addPageRoute = useStore((state) => state.addPageRoute);
  const switchPageRoute = useStore((state) => state.switchPageRoute);
  const setActiveRouteOutletKey = useStore((state) => state.setActiveRouteOutletKey);
  const setPageRouteConfig = useStore((state) => state.setPageRouteConfig);
  const removePageRoute = useStore((state) => state.removePageRoute);
  const setDefaultPageRoute = useStore((state) => state.setDefaultPageRoute);

  const [pageSettingsVisible, setPageSettingsVisible] = useState(false);
  const [deleteRouteDialogVisible, setDeleteRouteDialogVisible] = useState(false);
  const [routeConfigDraft, setRouteConfigDraft] = useState<RouteConfigDraft>({
    routePath: '',
    routeName: '',
    pageTitle: '',
    menuTitle: '',
    useLayout: true,
  });

  const routeOutlets = React.useMemo(() => collectRouteOutlets(uiPageData), [uiPageData]);

  const handleOpenRouteSettings = () => {
    setRouteConfigDraft({
      routePath: pageRouteConfig?.routePath ?? '',
      routeName: pageRouteConfig?.routeName ?? '',
      pageTitle: pageRouteConfig?.pageTitle ?? '',
      menuTitle: pageRouteConfig?.menuTitle ?? '',
      useLayout: pageRouteConfig?.useLayout !== false,
    });
    setPageSettingsVisible(true);
  };

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

  const handleApplyPageSettings = () => {
    const routePath = routeConfigDraft.routePath.trim();
    const routeName = routeConfigDraft.routeName.trim();
    if (routePath && !routePath.startsWith('/')) {
      emitApiAlert('保存失败', '页面路由路径必须以 / 开头');
      return;
    }

    if (routePath) {
      const duplicatedRoute = pageRoutes.find((route) => {
        if (route.routeId === activePageRouteId) {
          return false;
        }
        return route.routeConfig.routePath.trim() === routePath;
      });
      if (duplicatedRoute) {
        emitApiAlert('保存失败', `路由路径 ${routePath} 已存在，请使用其他路径`);
        return;
      }
    }

    if (routeName) {
      const duplicatedRouteName = pageRoutes.find((route) => {
        if (route.routeId === activePageRouteId) {
          return false;
        }
        return route.routeConfig.routeName.trim() === routeName;
      });
      if (duplicatedRouteName) {
        emitApiAlert('保存失败', `路由名称 ${routeName} 已存在，请使用其他名称`);
        return;
      }
    }

    setPageRouteConfig({
      routePath,
      routeName,
      pageTitle: routeConfigDraft.pageTitle.trim(),
      menuTitle: routeConfigDraft.menuTitle.trim(),
      useLayout: routeConfigDraft.useLayout,
    });
    setPageSettingsVisible(false);
  };

  const handleDeleteCurrentRoute = () => {
    if (!activePageRouteId) return;
    if (pageRoutes.length <= 1) {
      emitApiAlert('删除失败', '至少需要保留一条路由');
      return;
    }
    setDeleteRouteDialogVisible(true);
  };

  const handleConfirmDeleteCurrentRoute = () => {
    if (!activePageRouteId) {
      setDeleteRouteDialogVisible(false);
      return;
    }
    const activeRoute = pageRoutes.find((route) => route.routeId === activePageRouteId);
    const routeLabel =
      activeRoute?.routeConfig.routePath
      || activeRoute?.routeConfig.menuTitle
      || activeRoute?.routeConfig.routeName
      || '当前路由';
    removePageRoute(activePageRouteId);
    setDeleteRouteDialogVisible(false);
    setPageSettingsVisible(false);
    emitApiAlert('删除成功', `已删除路由 ${routeLabel}`, 'success');
  };

  const activeRouteIndex = pageRoutes.findIndex((route) => route.routeId === activePageRouteId);
  const canSetDefault = activeRouteIndex > 0;

  const handleSetCurrentRouteDefault = () => {
    if (!activePageRouteId) return;
    setDefaultPageRoute(activePageRouteId);
    emitApiAlert('设置成功', '当前路由已设为默认路由', 'success');
  };

  return (
    <>
      <div className="page-route-toolbar">
        <Select
          size='small'
          className="page-route-toolbar__select"
          value={activePageRouteId ?? undefined}
          options={pageRoutes.map((route) => ({
            label: `${route.routeConfig.menuTitle || route.routeConfig.pageTitle || route.routeConfig.routeName} · ${route.routeConfig.routePath || '/'}`,
            value: route.routeId,
          }))}
          onChange={(value) => switchPageRoute(String(value ?? ''))}
        />
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
        <TopbarIconButton
          tip="当前路由的路径、标题与布局等"
          label="路由设置"
          icon={<SettingIcon />}
          onClick={handleOpenRouteSettings}
        />
        <TopbarIconButton tip="新增一条页面路由" label="新增路由" icon={<AddIcon />} onClick={handleCreateRoute} />
      </div>

      <Drawer
        visible={pageSettingsVisible}
        header="当前路由设置"
        placement="right"
        size="420px"
        footer={false}
        onClose={() => setPageSettingsVisible(false)}
      >
        <div className="flow-config-drawer-form">
          <div className="flow-config-drawer-subtitle">
            这里配置当前路由的路径、名称和展示信息。切换路由后，下面的组件树、模拟器和流程都会一起切换。
          </div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">路由路径</div>
            <Input
              value={routeConfigDraft.routePath}
              placeholder="例如：/user/profile"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, routePath: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">路由名称</div>
            <Input
              value={routeConfigDraft.routeName}
              placeholder="例如：UserProfilePage"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, routeName: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">页面标题</div>
            <Input
              value={routeConfigDraft.pageTitle}
              placeholder="浏览器标题"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, pageTitle: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">菜单名称</div>
            <Input
              value={routeConfigDraft.menuTitle}
              placeholder="侧边菜单显示名"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, menuTitle: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field flow-config-field--switch">
            <div className="flow-config-field__label">使用主布局</div>
            <Switch
              value={routeConfigDraft.useLayout}
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, useLayout: Boolean(value) }))}
            />
          </div>

          <div className="flow-config-drawer-actions">
            <Button size="small" theme="default" variant="outline" disabled={!canSetDefault} onClick={handleSetCurrentRouteDefault}>
              设为默认
            </Button>
          </div>

          <div className="flow-config-drawer-actions">
            <Button
              size="small"
              theme="danger"
              variant="outline"
              disabled={pageRoutes.length <= 1}
              onClick={handleDeleteCurrentRoute}
            >
              删除当前路由
            </Button>
            <Button size="small" theme="default" variant="outline" onClick={() => setPageSettingsVisible(false)}>
              取消
            </Button>
            <Button size="small" theme="primary" onClick={handleApplyPageSettings}>
              应用设置
            </Button>
          </div>
        </div>
      </Drawer>

      <Dialog
        visible={deleteRouteDialogVisible}
        header="删除当前路由"
        confirmBtn="确认删除"
        cancelBtn="取消"
        onConfirm={handleConfirmDeleteCurrentRoute}
        onClose={() => setDeleteRouteDialogVisible(false)}
      >
        <div>删除后不可恢复，确认继续吗？</div>
      </Dialog>
    </>
  );
};

export default React.memo(PageRouteToolbar);

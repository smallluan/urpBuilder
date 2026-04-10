import omit from 'lodash/omit';
import type { ComponentDetail, ComponentTemplateContent, SaveComponentDraftPayload } from '../../api/types';
import { dehydrateUiTree, PROPS_STORAGE_VERSION } from '../template/propsHydration';

/**
 * 将接口返回的（已水合）组件模板转为保存草稿所需的脱水形态，与 HeaderControls 保存逻辑一致。
 */
export function dehydrateComponentTemplateForSave(template: ComponentTemplateContent): ComponentTemplateContent {
  const pageConfig = { ...template.pageConfig, propsStorageVersion: PROPS_STORAGE_VERSION };
  const rawPc = pageConfig as Record<string, unknown>;
  if (rawPc.sharedUiTree && typeof rawPc.sharedUiTree === 'object') {
    rawPc.sharedUiTree = dehydrateUiTree(rawPc.sharedUiTree as never) as unknown as Record<string, unknown>;
  }

  const next: ComponentTemplateContent = {
    ...template,
    uiTree: dehydrateUiTree(template.uiTree as never) as unknown as Record<string, unknown>,
    flowNodes: template.flowNodes,
    flowEdges: template.flowEdges,
    pageConfig,
  };

  if (Array.isArray(template.routes) && template.routes.length > 0) {
    next.routes = template.routes.map((r) => ({
      ...r,
      uiTree: dehydrateUiTree(r.uiTree as never) as unknown as Record<string, unknown>,
    }));
  }

  return next;
}

export function componentDetailToDraftBase(detail: ComponentDetail): SaveComponentDraftPayload['base'] {
  const stripped = omit(detail.base, ['status', 'currentVersion', 'updatedAt']);
  return {
    ...stripped,
    entityType: 'component',
    visibility: detail.base.visibility === 'public' ? 'public' : 'private',
  };
}

export function buildRollbackDraftPayload(detail: ComponentDetail): {
  base: SaveComponentDraftPayload['base'];
  template: ComponentTemplateContent;
} {
  return {
    base: componentDetailToDraftBase(detail),
    template: dehydrateComponentTemplateForSave(detail.template),
  };
}

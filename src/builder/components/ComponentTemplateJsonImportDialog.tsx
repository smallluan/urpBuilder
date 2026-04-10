import React, { useState } from 'react';
import { Dialog, Textarea, MessagePlugin } from 'tdesign-react';
import { FileJson2 } from 'lucide-react';
import {
  applyComponentTemplateFromImportedJson,
  templateToBuilderStatePatch,
} from '../utils/applyComponentTemplateFromImportedJson';
import { computePersistedTemplateFingerprint } from '../save/templateFingerprint';
import { normalizeUiTreeLegacyAntdTypes } from '../utils/normalizeUiTreeLegacyAntd';
import type { UiTreeNode } from '../store/types';
import type { StoreApi } from 'zustand';
import type { BuilderStore } from '../store/types';
import { TopbarIconButton } from './UnifiedBuilderTopbar';

type Props = {
  useStore: StoreApi<BuilderStore>;
  setCurrentPageMeta: (patch: Partial<{
    pageId: string;
    pageName: string;
    description: string;
    visibility: 'private' | 'public';
  }>) => void;
  readOnly?: boolean;
};

const PLACEHOLDER = `支持两种格式：
1) 仅模板：{ "uiTree": {...}, "flowNodes": [], "flowEdges": [], "pageConfig": {} }
2) 含元数据：{ "base": { "pageName", "pageId", "description" }, "template": { ... } }

示例见文档：docs/examples/login-component.template.json`;

export default function ComponentTemplateJsonImportDialog({
  useStore,
  setCurrentPageMeta,
  readOnly,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (readOnly) {
      MessagePlugin.warning('只读模式无法导入');
      return;
    }
    setLoading(true);
    try {
      const result = await applyComponentTemplateFromImportedJson(text);
      if (!result.ok) {
        MessagePlugin.error(result.message);
        return;
      }

      const patch = templateToBuilderStatePatch(result.data);
      const tree = normalizeUiTreeLegacyAntdTypes(patch.uiPageData as UiTreeNode);

      useStore.setState({
        ...patch,
        uiPageData: tree,
      });

      const b = result.data.base;
      if (b) {
        setCurrentPageMeta({
          ...(b.pageId !== undefined ? { pageId: b.pageId } : {}),
          ...(b.pageName !== undefined ? { pageName: b.pageName } : {}),
          ...(b.description !== undefined ? { description: b.description } : {}),
        });
      }

      useStore.getState().setLastPersistedTemplateFingerprint(
        computePersistedTemplateFingerprint(useStore.getState(), {
          enablePageRouteConfig: false,
          enableComponentContract: true,
          includePreviewUiLibrary: false,
        }),
      );

      MessagePlugin.success('已从 JSON 载入模板（含流程图数据）');
      setOpen(false);
      setText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopbarIconButton
        tip="从 JSON 导入整组件（UI + 流程），便于快速搭测试件"
        label="JSON"
        icon={<FileJson2 size={16} strokeWidth={2} />}
        disabled={readOnly}
        onClick={() => setOpen(true)}
      />
      <Dialog
        visible={open}
        header="从 JSON 导入组件模板"
        width={720}
        placement="center"
        closeOnOverlayClick={false}
        confirmBtn={{ content: '应用到画布', loading }}
        cancelBtn={{ content: '取消', disabled: loading }}
        onConfirm={() => handleApply()}
        onClose={() => !loading && setOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
            将覆盖当前画布与流程图内容；建议先保存或新开标签页再试。
          </div>
          <Textarea
            value={text}
            onChange={(v) => setText(String(v ?? ''))}
            placeholder={PLACEHOLDER}
            autosize={{ minRows: 16, maxRows: 28 }}
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
          />
        </div>
      </Dialog>
    </>
  );
}

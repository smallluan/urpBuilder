import { useState } from 'react';
import { Dialog, MessagePlugin, Textarea } from 'tdesign-react';
import { FileJson2 } from 'lucide-react';
import { applyPageTemplateFromImportedJson } from '../utils/applyPageTemplateFromImportedJson';
import type { PageTemplateBaseInfo } from '../../api/types';
import { TopbarIconButton } from './UnifiedBuilderTopbar';

type ApplyPageTemplateFn = (
  detail: { base?: PageTemplateBaseInfo | null; template?: Record<string, unknown> | null },
  options?: { pageIdFallback?: string; ignoreBasePageId?: boolean },
) => Promise<boolean>;

type Props = {
  applyPageTemplateDetailToEditor: ApplyPageTemplateFn;
  pageIdFallback: string;
  readOnly?: boolean;
  /** 导入成功后回调（例如解除只读提示） */
  onImported?: () => void;
};

const PLACEHOLDER = `支持两种格式：
1) 仅模板：{ "uiTree": {...}, "pageConfig": {}, "routes": [], "flowNodes": [], "flowEdges": [] }
2) 含元数据：{ "base": { "pageName", "description" }, "template": { ... } }

说明：导入时只会用 base 里的名称与描述；不会应用 base.pageId（请用保存对话框填写/锁定页面 ID）。
多路由示例见：docs/examples/todos-app-page.template.json`;

export default function PageTemplateJsonImportDialog({
  applyPageTemplateDetailToEditor,
  pageIdFallback,
  readOnly,
  onImported,
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
      const parsed = await applyPageTemplateFromImportedJson(text);
      if (!parsed.ok) {
        MessagePlugin.error(parsed.message);
        return;
      }

      const template = parsed.data.template as unknown as Record<string, unknown>;
      const base = parsed.data.base;

      const ok = await applyPageTemplateDetailToEditor(
        {
          base: base
            ? ({
              pageName: base.pageName,
              description: base.description,
            } as unknown as PageTemplateBaseInfo)
            : null,
          template,
        },
        { pageIdFallback, ignoreBasePageId: true },
      );

      if (!ok) {
        return;
      }

      onImported?.();

      MessagePlugin.success('已从 JSON 载入页面模板（含路由与流程图数据）');
      setOpen(false);
      setText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopbarIconButton
        tip="从 JSON 导入整页模板（UI + 多路由 + 流程），便于快速搭测试页"
        label="JSON"
        icon={<FileJson2 size={16} strokeWidth={2} />}
        disabled={readOnly}
        onClick={() => setOpen(true)}
      />
      <Dialog
        visible={open}
        header="从 JSON 导入页面模板"
        width={720}
        placement="center"
        closeOnOverlayClick={false}
        confirmBtn={{ content: '应用到画布', loading }}
        cancelBtn={{ content: '取消', disabled: loading }}
        onConfirm={() => {
          void handleApply();
        }}
        onClose={() => !loading && setOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
            将覆盖当前画布、路由与流程图内容；建议先保存或新开标签页再试。
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

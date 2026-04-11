import React, { useCallback, useState } from 'react';
import { Dialog, Input, MessagePlugin, Radio, Space, Textarea } from 'tdesign-react';
import type { FlowCodeListOutputContract } from '../../../types/flow';
import {
  parseListContractFromJsonText,
  parseListContractFromManualFields,
} from '../../utils/listOutputContractInference';

type Mode = 'json' | 'manual';

export interface CodeNodeListContractDialogProps {
  visible: boolean;
  initialContract?: FlowCodeListOutputContract | null;
  onClose: () => void;
  onConfirm: (contract: FlowCodeListOutputContract) => void;
}

const CodeNodeListContractDialog: React.FC<CodeNodeListContractDialogProps> = ({
  visible,
  initialContract,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<Mode>('json');
  const [jsonText, setJsonText] = useState('');
  const [arrayPath, setArrayPath] = useState('');
  const [manualText, setManualText] = useState('');

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    setMode('json');
    setJsonText('');
    setArrayPath(initialContract?.arrayPath ?? '');
    setManualText((initialContract?.fields ?? []).join(', '));
  }, [visible, initialContract]);

  const handleConfirm = useCallback(() => {
    if (mode === 'json') {
      const result = parseListContractFromJsonText(jsonText, arrayPath);
      if (!result.ok) {
        MessagePlugin.warning(result.message);
        return;
      }
      onConfirm(result.contract);
      onClose();
      return;
    }
    const result = parseListContractFromManualFields(manualText);
    if (!result.ok) {
      MessagePlugin.warning(result.message);
      return;
    }
    onConfirm(result.contract);
    onClose();
  }, [arrayPath, jsonText, manualText, mode, onClose, onConfirm]);

  return (
    <Dialog
      visible={visible}
      header="配置列表数据输出契约"
      width="560px"
      destroyOnClose
      closeOnOverlayClick={false}
      confirmBtn="保存"
      cancelBtn="取消"
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div style={{ fontSize: 12, color: 'var(--td-text-color-secondary)', lineHeight: 1.5 }}>
          用于动态列表「字段映射」下拉。可粘贴一条列表项 JSON、整包 JSON（需填数组路径）、或手填字段名。
          预览拉数时，代码应直接返回数组，或返回对象并由「数组路径」指向数组。
        </div>
        <Radio.Group value={mode} onChange={(v) => setMode(v as Mode)}>
          <Radio value="json">粘贴 JSON</Radio>
          <Radio value="manual">手填字段</Radio>
        </Radio.Group>

        {mode === 'json' ? (
          <>
            <div>
              <div style={{ fontSize: 12, marginBottom: 6 }}>数组路径（可选，整包 JSON 如 data.items 时填写）</div>
              <Input
                value={arrayPath}
                placeholder="例如 items 或 data.list，根为数组可留空"
                onChange={(v) => setArrayPath(String(v ?? ''))}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 6 }}>JSON 样本</div>
              <Textarea
                value={jsonText}
                autosize={{ minRows: 8, maxRows: 16 }}
                placeholder={'例如 [{"id":"1","title":"a"}] 或 {"title":"x","cover":""}'}
                onChange={(v) => setJsonText(String(v ?? ''))}
              />
            </div>
          </>
        ) : (
          <div>
            <div style={{ fontSize: 12, marginBottom: 6 }}>字段名（逗号、换行或分号分隔）</div>
            <Textarea
              value={manualText}
              autosize={{ minRows: 6, maxRows: 12 }}
              placeholder="id, title, cover"
              onChange={(v) => setManualText(String(v ?? ''))}
            />
          </div>
        )}
      </Space>
    </Dialog>
  );
};

export default CodeNodeListContractDialog;

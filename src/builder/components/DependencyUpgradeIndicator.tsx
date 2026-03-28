import React from 'react';
import { Badge, Button, Dialog, DialogPlugin, Space, Typography } from 'tdesign-react';
import { RefreshIcon } from 'tdesign-icons-react';

const { Text } = Typography;

export type DependencyUpgradeItem = {
  componentId: string;
  name: string;
  usedVersion: number;
  latestVersion: number;
};

export interface DependencyUpgradeIndicatorProps {
  items: DependencyUpgradeItem[];
  /** 单个组件升级 */
  onUpgradeOne: (componentId: string) => Promise<void> | void;
  /** 单个组件忽略（仅本次会话） */
  onIgnoreOne: (componentId: string) => void;
  /** 升级全部 */
  onUpgradeAll: () => Promise<void> | void;
  /** 忽略全部（仅本次会话） */
  onIgnoreAll: () => void;
}

const DependencyUpgradeIndicator: React.FC<DependencyUpgradeIndicatorProps> = ({ items, onUpgradeOne, onIgnoreOne, onUpgradeAll, onIgnoreAll }) => {
  const [dialogVisible, setDialogVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const count = items.length;

  React.useEffect(() => {
    if (count <= 0) {
      return;
    }
    const dialog = DialogPlugin.alert({
      header: '依赖组件有更新',
      body: `检测到 ${count} 个依赖组件有更新。你可以继续编辑；如需升级，请点右上角“更新”图标查看列表。`,
      confirmBtn: '我知道了',
      closeOnOverlayClick: true,
      onConfirm: () => dialog.destroy(),
      onCloseBtnClick: () => dialog.destroy(),
      onCancel: () => dialog.destroy(),
    });
    // 仅在进入时提示一次（每次进入编辑页会重新挂载组件，所以符合“每次进入都会通知”）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Badge count={count} size="small" offset={[0, 0]}>
        <Button
          size="small"
          variant="outline"
          theme="default"
          shape="circle"
          icon={<RefreshIcon />}
          onClick={() => setDialogVisible(true)}
          title={count > 0 ? `有 ${count} 个依赖组件可升级` : '依赖组件均已是最新'}
        />
      </Badge>

      <Dialog
        visible={dialogVisible}
        header="依赖组件更新列表"
        width={720}
        closeOnOverlayClick={false}
        onClose={() => setDialogVisible(false)}
        footer={
          <Space>
            <Button
              theme="default"
              variant="outline"
              disabled={busy}
              onClick={() => {
                onIgnoreAll();
                setDialogVisible(false);
              }}
            >
              忽略全部（本次）
            </Button>
            <Button
              theme="primary"
              loading={busy}
              onClick={async () => {
                try {
                  setBusy(true);
                  await onUpgradeAll();
                  setDialogVisible(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              升级全部
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 12 }}>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {items.length === 0 ? (
            <Text style={{ color: 'var(--td-text-color-secondary)', fontSize: 13 }}>
              当前没有待升级的依赖组件。
            </Text>
          ) : null}
          {items.map((item) => (
            <div
              key={item.componentId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid var(--td-component-border)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </div>
                <Text style={{ fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
                  ID: {item.componentId}
                </Text>
              </div>
              <Space align="center" size={8}>
                <Text style={{ fontSize: 13 }}>
                  {item.usedVersion > 0 ? `v${item.usedVersion}` : '未固定'} → v{item.latestVersion}
                </Text>
                <Button
                  size="small"
                  theme="primary"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      setBusy(true);
                      await onUpgradeOne(item.componentId);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  升级
                </Button>
                <Button
                  size="small"
                  theme="default"
                  variant="text"
                  disabled={busy}
                  onClick={() => onIgnoreOne(item.componentId)}
                >
                  忽略
                </Button>
              </Space>
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
};

export default DependencyUpgradeIndicator;


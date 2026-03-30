import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogPlugin, MessagePlugin, Space, Tag, Timeline, Typography } from 'tdesign-react';
import { JumpIcon } from 'tdesign-icons-react';
import { getComponentVersionList, getComponentTemplateDetail } from '../../api/componentTemplate';
import type { ComponentDetail, ComponentVersionListItem } from '../../api/types';
import { assessCustomComponentVersionSwitch } from '../../utils/customComponentVersionRisk';
import type { UiTreeNode } from '../store/types';

const { Text } = Typography;

export type ComponentVersionHistoryDialogProps = {
  visible: boolean;
  componentId: string;
  displayName: string;
  usedVersion: number;
  instanceNodes: UiTreeNode[];
  onClose: () => void;
  onApplyVersion: (version: number) => Promise<boolean>;
  catalogPath?: string;
};

const formatRelativeLabel = (itemVersion: number, used: number): string => {
  if (used > 0 && itemVersion === used) {
    return '当前使用';
  }
  if (used > 0 && itemVersion > used) {
    return '较新';
  }
  if (used > 0 && itemVersion < used) {
    return '较旧';
  }
  if (used <= 0) {
    return '参照';
  }
  return '';
};

const tagThemeForRel = (rel: string): 'success' | 'primary' | 'default' => {
  if (rel === '当前使用') {
    return 'success';
  }
  if (rel === '较新') {
    return 'primary';
  }
  return 'default';
};

const ComponentVersionHistoryDialog: React.FC<ComponentVersionHistoryDialogProps> = ({
  visible,
  componentId,
  displayName,
  usedVersion,
  instanceNodes,
  onClose,
  onApplyVersion,
  catalogPath = '/component-version-catalog',
}) => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ComponentVersionListItem[]>([]);
  const [applyBusy, setApplyBusy] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    const id = String(componentId ?? '').trim();
    if (!id) {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getComponentVersionList(id);
      const raw = res.data?.list;
      setList(Array.isArray(raw) ? raw : []);
    } catch {
      setList([]);
      MessagePlugin.warning('版本目录接口不可用（后端可能尚未部署）');
    } finally {
      setLoading(false);
    }
  }, [componentId]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void loadList();
  }, [visible, loadList]);

  const sortedList = useMemo(
    () => [...list].sort((a, b) => a.version - b.version),
    [list],
  );

  const openCatalog = () => {
    const id = encodeURIComponent(componentId);
    window.open(`${catalogPath}?id=${id}`, '_blank', 'noopener,noreferrer');
  };

  const handleApply = async (version: number) => {
    const id = String(componentId ?? '').trim();
    if (!id) {
      return;
    }
    setApplyBusy(version);
    try {
      const targetRes = await getComponentTemplateDetail(id, { version });
      const targetDetail = targetRes.data as ComponentDetail | undefined;
      if (!targetDetail?.base) {
        MessagePlugin.warning('无法加载该版本详情');
        return;
      }

      let sourceDetail: ComponentDetail | null = null;
      if (usedVersion > 0) {
        const sourceRes = await getComponentTemplateDetail(id, { version: usedVersion });
        sourceDetail = (sourceRes.data as ComponentDetail) ?? null;
      } else {
        const sourceRes = await getComponentTemplateDetail(id);
        sourceDetail = (sourceRes.data as ComponentDetail) ?? null;
      }

      const risk = assessCustomComponentVersionSwitch(instanceNodes, sourceDetail, targetDetail);
      if (risk.level === 'danger' && risk.reasons.length > 0) {
        const confirmed = await new Promise<boolean>((resolve) => {
          const dlg = DialogPlugin.confirm({
            header: '危险更新确认',
            body: (
              <div>
                <Text>切换到 v{version} 可能影响当前用法：</Text>
                <ul className="component-version-history-dialog__risk-list">
                  {risk.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ),
            confirmBtn: '仍要应用',
            cancelBtn: '取消',
            onConfirm: () => {
              dlg.destroy();
              resolve(true);
            },
            onClose: () => {
              dlg.destroy();
              resolve(false);
            },
          });
        });
        if (!confirmed) {
          return;
        }
      } else if (risk.level === 'warning' && risk.reasons.length > 0) {
        MessagePlugin.warning(risk.reasons[0]);
      }

      const ok = await onApplyVersion(version);
      if (ok) {
        onClose();
      }
    } finally {
      setApplyBusy(null);
    }
  };

  return (
    <Dialog
      visible={visible}
      header={`版本时间线 · ${displayName}`}
      width={820}
      className="component-version-history-dialog"
      closeOnOverlayClick={false}
      confirmBtn={null}
      cancelBtn={null}
      onClose={onClose}
      footer={
        <Space>
          <Button variant="outline" onClick={openCatalog}>
            <JumpIcon style={{ marginRight: 4 }} />
            独立页查看
          </Button>
          <Button theme="primary" onClick={onClose}>
            关闭
          </Button>
        </Space>
      }
    >
      <div className="component-version-history-dialog__meta">
        <Text>
          <span className="component-version-history-dialog__meta-id">{componentId}</span>
          {usedVersion > 0 ? ` · 当前钉住 v${usedVersion}` : ' · 未固定版本'}
        </Text>
      </div>
      {loading ? (
        <Text className="component-version-history-dialog__loading">加载版本列表…</Text>
      ) : sortedList.length === 0 ? (
        <Text theme="warning" className="component-version-history-dialog__empty">
          暂无版本目录。请后端接入 GET /page-template/&#123;id&#125;/versions?entityType=component
        </Text>
      ) : (
        <div className="component-version-history-dialog__timeline-wrap">
          <Timeline
            layout="vertical"
            mode="alternate"
            labelAlign="alternate"
            theme="dot"
            className="component-version-history-dialog__timeline"
          >
            {sortedList.map((item) => {
              const rel = formatRelativeLabel(item.version, usedVersion);
              const note =
                item.versionNote && String(item.versionNote).trim() ? String(item.versionNote) : '（无版本说明）';
              return (
                <Timeline.Item
                  key={item.version}
                  label={
                    <div className="component-version-history-dialog__axis-label">
                      <Text strong className="component-version-history-dialog__ver">
                        v{item.version}
                      </Text>
                      {rel ? (
                        <Tag size="small" theme={tagThemeForRel(rel)}>
                          {rel}
                        </Tag>
                      ) : null}
                    </div>
                  }
                >
                  <div className="component-version-history-dialog__card">
                    <Text className="component-version-history-dialog__time">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '—'}
                    </Text>
                    <Text className="component-version-history-dialog__note">{note}</Text>
                    <Button
                      size="small"
                      theme="primary"
                      variant="outline"
                      className="component-version-history-dialog__apply"
                      loading={applyBusy === item.version}
                      disabled={applyBusy !== null && applyBusy !== item.version}
                      onClick={() => void handleApply(item.version)}
                    >
                      应用此版本
                    </Button>
                  </div>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </div>
      )}
    </Dialog>
  );
};

export default ComponentVersionHistoryDialog;

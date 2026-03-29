import { Button, Dropdown, Space } from 'tdesign-react';
import type { DropdownOption } from 'tdesign-react/es/dropdown/type';
import {
  DeleteIcon,
  Edit1Icon,
  JumpIcon,
  LockOffIcon,
  LockOnIcon,
  MoreIcon,
  RollbackIcon,
  ViewImageIcon,
} from 'tdesign-icons-react';

export type ResourceRowOperationsProps = {
  canManage: boolean;
  isPublished: boolean;
  isPublic: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onToggleVisibility: () => void;
  onWithdraw: () => void;
  onDelete: () => void;
};

const iconSm = { size: '16px' } as const;

/**
 * 搭建页 / 搭建组件列表：操作列（外显预览、修改；名称列可点查看详情；其余进「更多」Dropdown）
 */
export default function ResourceRowOperations({
  canManage,
  isPublished,
  isPublic,
  onPreview,
  onEdit,
  onPublish,
  onToggleVisibility,
  onWithdraw,
  onDelete,
}: ResourceRowOperationsProps) {
  const moreOptions: DropdownOption[] = [];

  if (canManage && !isPublished) {
    moreOptions.push({
      content: '发布',
      value: 'publish',
      prefixIcon: <JumpIcon {...iconSm} />,
      onClick: () => onPublish(),
    });
  }

  if (canManage && isPublished) {
    moreOptions.push({
      content: isPublic ? '设为私有' : '设为公开',
      value: 'visibility',
      prefixIcon: isPublic ? <LockOnIcon {...iconSm} /> : <LockOffIcon {...iconSm} />,
      onClick: () => onToggleVisibility(),
    });
    moreOptions.push({
      content: '收回为草稿',
      value: 'withdraw',
      prefixIcon: <RollbackIcon {...iconSm} />,
      onClick: () => onWithdraw(),
    });
  }

  if (canManage) {
    moreOptions.push({
      content: '删除',
      value: 'delete',
      theme: 'error',
      prefixIcon: <DeleteIcon {...iconSm} />,
      onClick: () => onDelete(),
    });
  }

  return (
    <Space size={6} align="center" className="resource-table__ops">
      <Button size="small" variant="outline" icon={<ViewImageIcon {...iconSm} />} onClick={onPreview}>
        预览
      </Button>
      {canManage ? (
        <Button size="small" theme="primary" variant="outline" icon={<Edit1Icon {...iconSm} />} onClick={onEdit}>
          修改
        </Button>
      ) : null}
      {moreOptions.length > 0 ? (
        <Dropdown
          trigger="click"
          placement="bottom-right"
          options={moreOptions}
          minColumnWidth={120}
          maxColumnWidth={220}
          popupProps={{ overlayInnerStyle: { padding: '4px 0' } }}
        >
          <Button size="small" variant="dashed" icon={<MoreIcon {...iconSm} />}>
            更多
          </Button>
        </Dropdown>
      ) : null}
    </Space>
  );
}

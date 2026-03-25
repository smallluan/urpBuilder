import React from 'react';
import { Button, Card, Image, Space, Tag, Typography } from 'tdesign-react';
import { DeleteIcon, EditIcon, Fullscreen1Icon } from 'tdesign-icons-react';
import type { TeamAssetDTO } from '../../api/types';
import { setMediaAssetDragData } from '../../utils/mediaAssetDrag';
import { assetTypeLabel, formatBytes } from './format';

const { Text } = Typography;

export interface TeamAssetGridCardProps {
  asset: TeamAssetDTO;
  selected?: boolean;
  mode: 'manage' | 'pick';
  onSelect?: (asset: TeamAssetDTO) => void;
  onPreview: (asset: TeamAssetDTO) => void;
  onRename?: (asset: TeamAssetDTO) => void;
  onDelete?: (asset: TeamAssetDTO) => void;
  /** 是否允许拖出素材 URL（画布 / 属性栏 / 弹窗内投放区） */
  assetDragEnabled?: boolean;
}

const TeamAssetGridCard: React.FC<TeamAssetGridCardProps> = ({
  asset,
  selected,
  mode,
  onSelect,
  onPreview,
  onRename,
  onDelete,
  assetDragEnabled = true,
}) => {
  const thumb = asset.thumbnailUrl || asset.url;
  const isPick = mode === 'pick';
  const dragEnabled = assetDragEnabled !== false && Boolean(asset.url?.trim());

  return (
    <div
      role={isPick ? 'button' : undefined}
      className={`data-assets-card-wrap${isPick ? ' data-assets-card-wrap--pick' : ''}${dragEnabled ? ' data-assets-card-wrap--draggable' : ''}`}
      draggable={dragEnabled}
      title={dragEnabled ? '拖拽到画布图片、右侧地址栏或弹窗内投放区以引用素材' : undefined}
      onDragStart={
        dragEnabled
          ? (e) => {
              e.stopPropagation();
              setMediaAssetDragData(e, { url: asset.url, name: asset.name });
            }
          : undefined
      }
      onClick={() => {
        if (isPick) {
          onSelect?.(asset);
        }
      }}
      onKeyDown={isPick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(asset);
        }
      } : undefined}
      tabIndex={isPick ? 0 : undefined}
    >
    <Card
      bordered
      hoverShadow
      className={`data-assets-card${selected ? ' data-assets-card--selected' : ''}`}
    >
      <div className="data-assets-card__thumb-wrap">
        <Image
          className="data-assets-card__thumb"
          src={thumb}
          fit="contain"
          alt={asset.name}
          loading="lazy"
        />
        <div className="data-assets-card__thumb-mask">
          <Space size={4}>
            <Button
              draggable={false}
              size="small"
              shape="circle"
              variant="outline"
              theme="default"
              icon={<Fullscreen1Icon />}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(asset);
              }}
            />
            {mode === 'manage' ? (
              <>
                <Button
                  draggable={false}
                  size="small"
                  shape="circle"
                  variant="outline"
                  theme="default"
                  icon={<EditIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename?.(asset);
                  }}
                />
                <Button
                  draggable={false}
                  size="small"
                  shape="circle"
                  variant="outline"
                  theme="danger"
                  icon={<DeleteIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(asset);
                  }}
                />
              </>
            ) : null}
          </Space>
        </div>
      </div>
      <div className="data-assets-card__meta">
        <Text className="data-assets-card__name" ellipsis>
          {asset.name}
        </Text>
        <Space size={4} align="center" style={{ marginTop: 6 }}>
          <Tag size="small" variant="light">
            {assetTypeLabel(asset.type)}
          </Tag>
          <span className="data-assets-card__size">{formatBytes(asset.sizeBytes)}</span>
        </Space>
      </div>
    </Card>
    </div>
  );
};

export default TeamAssetGridCard;

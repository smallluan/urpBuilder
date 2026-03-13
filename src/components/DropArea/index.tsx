import React, { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { AddCircleIcon } from 'tdesign-icons-react';
import './index.less';
import CommonComponent from '../../pages/CreateComponent/components/CommonComponent';
import type { UiDropDataHandler, UiTreeNode } from '../../pages/CreateComponent/store/type';
import { useCreateComponentStore } from '../../pages/CreateComponent/store';

interface DropAreaProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  emptyText?: string;
  data?: UiTreeNode;
  onDropData?: UiDropDataHandler;
  dropSlotKey?: string;
  selectable?: boolean;
  compactWhenFilled?: boolean;
  isTreeNode?: boolean;
}

const DROP_DATA_KEY = 'drag-component-data';

const RenderNode: React.FC<{
  data?: UiTreeNode;
  emptyText: string;
  onDropData?: UiDropDataHandler;
}> = ({ data, emptyText, onDropData }) => {
  if (data?.children?.length) {
    return (
      <>
        {data.children.map((child) => (
          <CommonComponent key={child.key} type={child.type} data={child} onDropData={onDropData} />
        ))}
      </>
    );
  }

  return (
    <div className="drop-area-empty">
      <AddCircleIcon className="drop-area-empty-icon" />
      <span>{emptyText}</span>
    </div>
  );
};

const renderNodeList = (
  data: UiTreeNode | undefined,
  onDropData?: UiDropDataHandler,
) =>
  data?.children?.map((child) => (
    <CommonComponent key={child.key} type={child.type} data={child} onDropData={onDropData} />
  ));

export default function DropArea({
  children,
  style,
  className = '',
  disabled = false,
  emptyText = '拖拽组件到此处',
  data,
  onDropData,
  dropSlotKey,
  selectable = true,
  compactWhenFilled = false,
  isTreeNode = false,
}: DropAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const childrenLength = React.Children.count(children);
  const activeNodeKey = useCreateComponentStore((state) => state.activeNodeKey);
  const setActiveNode = useCreateComponentStore((state) => state.setActiveNode);
  const isNodeActive = !!data?.key && activeNodeKey === data.key;

  // 拖拽经过时允许放置，并切换高亮态
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  // 鼠标离开放置区时取消高亮
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  // 放置时解析 dataTransfer 数据并通过回调抛给上层处理
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const rawData = event.dataTransfer.getData(DROP_DATA_KEY);
    if (!rawData) {
      return;
    }

    try {
      const parsedData = JSON.parse(rawData);
      onDropData?.(parsedData, data, dropSlotKey ? { slotKey: dropSlotKey } : undefined);
    } catch {
      console.error(rawData)
    }
  };

  const dropAreaClassName = useMemo(() => {
    const dragOverClass = isDragOver ? ' drop-area-active' : '';
    const selectedClass = isNodeActive ? ' drop-area-selected' : '';
    const anchorClass = ' builder-node-anchor';
    const anchorActiveClass = isNodeActive ? ' builder-node-anchor--active' : '';
    const filledClass = compactWhenFilled && (data?.children?.length ?? 0) > 0 ? ' drop-area--filled' : '';
    return `drop-area${dragOverClass}${selectedClass}${anchorClass}${anchorActiveClass}${filledClass}${className ? ` ${className}` : ''}`;
  }, [className, compactWhenFilled, data?.children?.length, isDragOver, isNodeActive]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectable) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    event.stopPropagation();
    if (!data?.key) {
      return;
    }

    setActiveNode(data.key);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      data-builder-node-key={data?.key || undefined}
      data-active={isNodeActive ? 'true' : 'false'}
      className={dropAreaClassName}
      style={style}
    >
      {childrenLength ? (
        React.Children.map(children, (child) => {
          if (React.isValidElement(child) && !isTreeNode) {
            const nodeList = renderNodeList(data, onDropData);
            return React.cloneElement(
              child,
              undefined,
              nodeList?.length
                ? nodeList
                : <RenderNode data={data} emptyText={emptyText} onDropData={onDropData} />,
            );
          }
          return child;
        })
      ) : (
        <RenderNode data={data} emptyText={emptyText} onDropData={onDropData} />
      )}
    </div>
  );
}

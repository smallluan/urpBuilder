import React, { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import './index.less';

interface DropAreaProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  emptyText?: string;
  onDropData?: (dropData: unknown, event: DragEvent<HTMLDivElement>) => void;
}

const DROP_DATA_KEY = 'drag-component-data';

export default function DropArea({
  children,
  style,
  className = '',
  disabled = false,
  emptyText = '拖拽组件到此处',
  onDropData,
}: DropAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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
      console.log(parsedData)
      onDropData?.(parsedData, event);
    } catch {
      console.error(rawData)
      onDropData?.(rawData, event);
    }
  };

  const dropAreaClassName = useMemo(() => {
    const activeClass = isDragOver ? ' drop-area-active' : '';
    return `drop-area${activeClass}${className ? ` ${className}` : ''}`;
  }, [className, isDragOver]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={dropAreaClassName}
      style={style}
    >
      {children ?? <div className="drop-area-empty">{emptyText}</div>}
    </div>
  );
}

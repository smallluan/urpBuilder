import React from 'react';
import './style.less';

interface DragableItemProps {
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, data: DragableItemProps['data']) => void;
  /** 拖拽结束（放置成功、取消或拖出窗口时均会触发），用于关闭组件库分组弹层等 */
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  data: any;
  children?: React.ReactNode;
}

export default function DragableWrapper(props: DragableItemProps) {
  const { draggable, onDragStart, onDragEnd, data, children } = props;
  return (
    <div
      draggable={draggable ?? true}
      onDragStart={(e) => onDragStart?.(e, data)}
      onDragEnd={(e) => onDragEnd?.(e)}
      className="dragable-wrapper"
    >
      {children}
    </div>
  );
}

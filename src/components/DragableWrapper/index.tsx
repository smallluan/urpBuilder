import React from 'react'
import "./style.less"

interface DragableItemProps {
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, data: DragableItemProps['data']) => void;
  data: any;
  children?: React.ReactNode
}

export default function DragableWrapper(props: DragableItemProps) {
  return (
    <div
      {...props}
      draggable={props.draggable ?? true}
      onDragStart={(e) => props.onDragStart?.(e, props.data)}
      className="dragable-wrapper"
    >
      {props.children}
    </div>
  )
}

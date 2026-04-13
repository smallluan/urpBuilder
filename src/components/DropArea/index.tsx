import React, { useMemo, useState, type CSSProperties } from 'react';
import type { DragEvent } from 'react';
import { AddCircleIcon } from 'tdesign-icons-react';
import './index.less';
import CommonComponent from '../../builder/renderer/CommonComponent';
import type { UiDropDataHandler, UiTreeNode } from '../../builder/store/types';
import { useBuilderContext } from '../../builder/context/BuilderContext';
import { resolveSimulatorStyle } from '../../builder/utils/simulatorStyle';

/**
 * 搭建器布局约定：存在单个子元素时，会把 data.children 渲染结果注入为该子元素的 children。
 * 布局容器（flex/grid 等）必须把「布局宿主」作为 DropArea 的唯一子节点，勿写成「宿主包住唯一 DropArea」。
 * 详见 src/builder/renderer/registries/layoutComponents.tsx 文件顶部注释。
 */

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

const mergeDragOverClass = (existing: unknown, isDragOver: boolean) => {
  const base = typeof existing === 'string' ? existing : '';
  return `${base}${isDragOver ? ' drop-area--drag-over-target' : ''}`.trim();
};

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
  const { useStore } = useBuilderContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDisabled = disabled || !onDropData;
  const childrenLength = React.Children.count(children);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const isNodeActive = useStore((state) => (!!data?.key && state.activeNodeKey === data.key));

  // 拖拽经过时允许放置，并切换高亮态
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (dragDisabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  // 鼠标离开放置区时取消高亮
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (dragDisabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  // 放置时解析 dataTransfer 数据并通过回调抛给上层处理
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (dragDisabled) {
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

  /**
   * 无布局宿主时（空插槽、页面根 drop-area-root 等）：壳层需要承载 __style。
   * 若同时传入 layout `style`（如根节点的 minHeight/flex）与节点 `__style`，必须合并，
   * 否则仅写 `style` 时会完全忽略用户在样式面板配置的 margin/padding 等。
   * 有单个子宿主时由 registry 的 mergeStyle 写在子节点上，避免重复合并到 drop-area。
   */
  const shellOnlyStyle = useMemo((): CSSProperties | undefined => {
    const raw = (data?.props?.__style as { value?: unknown } | undefined)?.value;
    const fromNode =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as CSSProperties) : undefined;
    const resolvedNode = fromNode
      ? resolveSimulatorStyle(fromNode, { mapFixedToAbsolute: true })
      : undefined;
    const resolvedProp =
      style !== undefined
        ? resolveSimulatorStyle(style, { mapFixedToAbsolute: true })
        : undefined;

    if (!resolvedNode && !resolvedProp) {
      return undefined;
    }

    return { ...(resolvedProp ?? {}), ...(resolvedNode ?? {}) };
  }, [data?.props?.__style, style]);

  const shouldInjectStyleIntoHost =
    childrenLength === 1 && !isTreeNode && React.isValidElement(React.Children.only(children));

  /** 单宿主时：DropArea 的 style  prop（如 Grid.Row 的 width:100%）合并进布局宿主，与预览一致。 */
  const hostExtraStyleFromDropAreaProp = useMemo((): CSSProperties | undefined => {
    if (style === undefined) {
      return undefined;
    }
    return resolveSimulatorStyle(style, { mapFixedToAbsolute: true });
  }, [style]);

  const isRootLikeDropArea =
    className.includes('drop-area-root') || className.includes('drop-area--route-outlet');

  const dropAreaClassName = useMemo(() => {
    /** 非根画布/路由出口：保留真实布局盒，避免 index.less 中 display:contents 导致无法命中拖拽，事件落到根画布 */
    const nestedHostClass = !isRootLikeDropArea ? ' drop-area--nested-host' : '';
    const dragOverVisualClass =
      isDragOver && !dragDisabled
        ? (isRootLikeDropArea ? ' drop-area-active' : ' drop-area--drag-over-target')
        : '';
    const filledClass = compactWhenFilled && (data?.children?.length ?? 0) > 0 ? ' drop-area--filled' : '';
    return `drop-area${nestedHostClass}${dragOverVisualClass}${filledClass}${className ? ` ${className}` : ''}`;
  }, [
    className,
    compactWhenFilled,
    data?.children?.length,
    dragDisabled,
    isDragOver,
    isRootLikeDropArea,
  ]);

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

  const outerStyle = shouldInjectStyleIntoHost ? undefined : shellOnlyStyle;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      data-builder-node-key={data?.key || undefined}
      data-active={isNodeActive ? 'true' : 'false'}
      className={dropAreaClassName}
      style={outerStyle}
    >
      <div className="drop-area__body">
        {childrenLength ? (
          React.Children.map(children, (child) => {
            if (React.isValidElement(child) && !isTreeNode) {
              const nodeList = renderNodeList(data, onDropData);
              const childProps = (child.props ?? {}) as { className?: string; style?: CSSProperties };
              /** 根/路由出口无 nested-host 时，高亮画在子宿主上；其余由外壳 `.drop-area` 承担，避免双层虚线 */
              const nextClassName = mergeDragOverClass(childProps.className, isDragOver && isRootLikeDropArea);
              const baseChildStyle =
                childProps.style && typeof childProps.style === 'object' && !Array.isArray(childProps.style)
                  ? childProps.style
                  : undefined;
              const cloneProps: { className?: string; style?: CSSProperties } = {
                className: nextClassName || undefined,
              };
              if (hostExtraStyleFromDropAreaProp) {
                cloneProps.style = { ...(baseChildStyle ?? {}), ...hostExtraStyleFromDropAreaProp };
              }
              return React.cloneElement(
                child,
                cloneProps,
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
    </div>
  );
}

import React from 'react';
import { Space, Row, Card, Divider, Menu } from 'tdesign-react';
import type { UiTreeNode } from '../store/types';
import { renderNamedIcon } from '../../constants/iconRegistry';

/** 激活包裹层：负责点击选中 + 节点锚点标记 */
export interface ActivateWrapperProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
  nodeKey?: string;
  active?: boolean;
}

export const ActivateWrapper: React.FC<ActivateWrapperProps> = ({ children, style, onActivate, nodeKey, active }) => (
  (() => {
    const onlyChild = React.Children.count(children) === 1 ? React.Children.only(children) : null;
    if (React.isValidElement(onlyChild)) {
      const childProps = (onlyChild.props ?? {}) as Record<string, unknown>;
      const originalClassName = typeof childProps.className === 'string' ? childProps.className : '';
      const mergedClassName = `${originalClassName} builder-node-anchor${active ? ' builder-node-anchor--active' : ''}`.trim();
      const originalStyle = (childProps.style as React.CSSProperties | undefined) ?? {};
      const originalOnClick = childProps.onClick as ((event: React.MouseEvent<HTMLElement>) => void) | undefined;
      return React.cloneElement(onlyChild as React.ReactElement<Record<string, unknown>>, {
        ...childProps,
        style: { ...originalStyle, ...(style ?? {}) },
        className: mergedClassName,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          onActivate(event);
          if (originalOnClick) {
            originalOnClick(event);
          }
        },
        'data-builder-node-key': nodeKey || undefined,
      });
    }

    return <>{children}</>;
  })()
);

/** Space 组件包裹层，含 split 功能 */
export interface SpaceContentProps {
  children?: React.ReactNode;
  align?: string;
  direction?: 'horizontal' | 'vertical';
  size?: number;
  breakLine?: boolean;
  isSpaceSplitEnabled: boolean;
  spaceSplitLayout: 'horizontal' | 'vertical';
  spaceSplitDashed?: boolean;
  spaceSplitAlign?: string;
  spaceSplitContent?: string;
  style?: React.CSSProperties;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
  nodeKey?: string;
  active?: boolean;
}

export const SpaceContent: React.FC<SpaceContentProps> = ({
  children, align, direction, size, breakLine,
  isSpaceSplitEnabled, spaceSplitLayout, spaceSplitDashed, spaceSplitAlign, spaceSplitContent,
  style, onActivate, nodeKey, active,
}) => {
  const childrenList = React.Children.toArray(children);

  if (!isSpaceSplitEnabled || childrenList.length <= 1) {
    return (
      <ActivateWrapper style={style} onActivate={onActivate} nodeKey={nodeKey} active={active}>
        <Space align={align as any} direction={direction as any} size={size} breakLine={breakLine}>
          {children}
        </Space>
      </ActivateWrapper>
    );
  }

  const mergedChildren: React.ReactNode[] = [];
  childrenList.forEach((child, index) => {
    mergedChildren.push(child);
    if (index < childrenList.length - 1) {
      mergedChildren.push(
        <Divider
          key={`space-split-${index}`}
          layout={spaceSplitLayout}
          dashed={spaceSplitDashed}
          align={spaceSplitAlign as any}
          content={spaceSplitLayout === 'horizontal' ? spaceSplitContent : undefined}
        />,
      );
    }
  });

  return (
    <ActivateWrapper style={style} onActivate={onActivate} nodeKey={nodeKey} active={active}>
      <Space align={align as any} direction={direction as any} size={size} breakLine={breakLine}>
        {mergedChildren}
      </Space>
    </ActivateWrapper>
  );
};

/** Row 包裹层（无需激活包裹，由外层 DropArea 处理） */
export interface RowContentProps {
  children?: React.ReactNode;
  align?: string;
  justify?: string;
  gutter?: number;
  style?: React.CSSProperties;
}

export const RowContent: React.FC<RowContentProps> = ({ children, align, justify, gutter, style }) => (
  <Row align={align as any} justify={justify as any} gutter={gutter} style={style}>
    {children}
  </Row>
);

/** Card 包裹层 */
export interface CardContentProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  size?: string;
  bordered?: boolean;
  headerBordered?: boolean;
  shadow?: boolean;
  hoverShadow?: boolean;
  style?: React.CSSProperties;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
  nodeKey?: string;
  active?: boolean;
}

export const CardContent: React.FC<CardContentProps> = ({
  children, header, title, subtitle, size, bordered, headerBordered, shadow, hoverShadow,
  style, onActivate, nodeKey, active,
}) => (
  <ActivateWrapper style={style} onActivate={onActivate} nodeKey={nodeKey} active={active}>
    <Card
      header={header}
      title={title}
      subtitle={subtitle}
      size={size as any}
      bordered={bordered}
      headerBordered={headerBordered}
      shadow={shadow}
      hoverShadow={hoverShadow}
    >
      {children}
    </Card>
  </ActivateWrapper>
);

/** 创建菜单节点递归渲染器（注入 setActiveNode，避免在 CommonComponent 内部定义） */
export function buildMenuNodesRenderer(setActiveNode: (key: string) => void) {
  function renderBuilderMenuNodes(nodes?: UiTreeNode[]): React.ReactNode {
    return (nodes ?? []).map((child) => {
      const childType = typeof child.type === 'string' ? child.type.trim() : child.type;
      const getChildProp = (propName: string) => {
        const prop = child.props?.[propName] as { value?: unknown } | undefined;
        return prop?.value;
      };
      const getChildStringProp = (propName: string) => {
        const value = getChildProp(propName);
        return typeof value === 'string' ? value : undefined;
      };
      const getChildTextProp = (propName: string) => {
        const value = getChildProp(propName);
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        return undefined;
      };
      const getChildBooleanProp = (propName: string) => {
        const value = getChildProp(propName);
        return typeof value === 'boolean' ? value : undefined;
      };

      if (getChildBooleanProp('visible') === false) return null;

      if (childType === 'Menu.Submenu') {
        const iconNode = renderNamedIcon(getChildStringProp('iconName'));
        const submenuValue = getChildStringProp('value')?.trim() || child.key;
        return (
          <Menu.SubMenu
            key={child.key}
            value={submenuValue}
            title={getChildTextProp('title') || undefined}
            content={getChildTextProp('content') || undefined}
            icon={iconNode as any}
            disabled={getChildBooleanProp('disabled')}
          >
            {renderBuilderMenuNodes(child.children)}
          </Menu.SubMenu>
        );
      }

      if (childType === 'Menu.Group') {
        return (
          <Menu.MenuGroup key={child.key} title={getChildTextProp('title') || undefined}>
            {renderBuilderMenuNodes(child.children)}
          </Menu.MenuGroup>
        );
      }

      if (childType === 'Menu.Item') {
        const iconNode = renderNamedIcon(getChildStringProp('iconName'));
        const itemValue = getChildStringProp('value')?.trim() || child.key;
        return (
          <Menu.MenuItem
            key={child.key}
            value={itemValue}
            content={getChildTextProp('content') || undefined}
            icon={iconNode as any}
            href={getChildStringProp('href') || undefined}
            target={getChildStringProp('target') as any}
            disabled={getChildBooleanProp('disabled')}
            onClick={(context) => {
              context.e.stopPropagation();
              setActiveNode(child.key);
            }}
          />
        );
      }

      return null;
    });
  }

  return renderBuilderMenuNodes;
}

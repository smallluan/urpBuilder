import React from 'react';
import { Col, Layout } from 'tdesign-react';
import type { ComponentRegistry } from '../componentContext';
import { SpaceContent, RowContent } from '../componentHelpers';
import DropArea from '../../../components/DropArea';
import { StickyBoundaryHost } from '../../components/StickyBoundaryHost';

const { Header, Content, Aside, Footer } = Layout;

/**
 * DropArea 布局宿主规范（与 Grid.Row + RowContent 一致）：
 * - 禁止：外层 flex/grid 容器内只放一个 DropArea（flex 只会作用到 DropArea 一块，子树 gap 等失效）。
 * - 必须：DropArea 的唯一子元素即「布局宿主」，由 DropArea cloneElement 将 data.children 注入为该子元素的 children。
 * - __style：与 PreviewRenderer 同角色节点一致，合并到内层宿主（含 display:flex 的 div 或下方 Layout 外包的 div）。
 */

/** 预览态 Layout 为 div(__style) > Layout > children；className 供 DropArea 拖拽态 outline，勿删 */
const BuilderLayoutRoot: React.FC<{ style?: React.CSSProperties; className?: string; children?: React.ReactNode }> = ({
  style,
  className,
  children,
}) => (
  <div style={style} className={className}>
    <Layout>{children}</Layout>
  </div>
);

const BuilderLayoutHeaderRoot: React.FC<{ style?: React.CSSProperties; className?: string; children?: React.ReactNode }> = ({
  style,
  className,
  children,
}) => (
  <div style={style} className={className}>
    <Header>{children}</Header>
  </div>
);

const BuilderLayoutContentRoot: React.FC<{ style?: React.CSSProperties; className?: string; children?: React.ReactNode }> = ({
  style,
  className,
  children,
}) => (
  <div style={style} className={className}>
    <Content>{children}</Content>
  </div>
);

const BuilderLayoutAsideRoot: React.FC<{ style?: React.CSSProperties; className?: string; children?: React.ReactNode }> = ({
  style,
  className,
  children,
}) => (
  <div style={style} className={className}>
    <Aside>{children}</Aside>
  </div>
);

const BuilderLayoutFooterRoot: React.FC<{ style?: React.CSSProperties; className?: string; children?: React.ReactNode }> = ({
  style,
  className,
  children,
}) => (
  <div style={style} className={className}>
    <Footer>{children}</Footer>
  </div>
);

export function registerLayoutComponents(registry: ComponentRegistry): void {
  registry.set('Flex', (ctx) => {
    const { data, onDropData, getStringProp, getBooleanProp, getNumberProp, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <div
          style={mergeStyle({
            display: 'flex',
            flexDirection: (getStringProp('direction') as React.CSSProperties['flexDirection']) ?? 'row',
            justifyContent: (getStringProp('justify') as React.CSSProperties['justifyContent']) ?? 'flex-start',
            alignItems: (getStringProp('align') as React.CSSProperties['alignItems']) ?? 'stretch',
            flexWrap: getBooleanProp('wrap') ? 'wrap' : 'nowrap',
            gap: getNumberProp('gap') ?? 8,
          })}
        />
      </DropArea>
    );
  });

  registry.set('Flex.Item', (ctx) => {
    const { data, onDropData, getStringProp, getNumberProp, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <div
          style={mergeStyle({
            flexGrow: getNumberProp('grow') ?? 0,
            flexShrink: getNumberProp('shrink') ?? 1,
            flexBasis: getStringProp('basis') || 'auto',
            alignSelf: (getStringProp('alignSelf') as React.CSSProperties['alignSelf']) || undefined,
            minWidth: 0,
          })}
        />
      </DropArea>
    );
  });

  registry.set('Stack', (ctx) => {
    const { data, onDropData, getStringProp, getNumberProp, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <div
          style={mergeStyle({
            display: 'flex',
            flexDirection: 'column',
            justifyContent: (getStringProp('justify') as React.CSSProperties['justifyContent']) ?? 'flex-start',
            alignItems: (getStringProp('align') as React.CSSProperties['alignItems']) ?? 'stretch',
            gap: getNumberProp('gap') ?? 8,
          })}
        />
      </DropArea>
    );
  });

  registry.set('Inline', (ctx) => {
    const { data, onDropData, getStringProp, getBooleanProp, getNumberProp, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <div
          style={mergeStyle({
            display: 'flex',
            flexDirection: 'row',
            justifyContent: (getStringProp('justify') as React.CSSProperties['justifyContent']) ?? 'flex-start',
            alignItems: (getStringProp('align') as React.CSSProperties['alignItems']) ?? 'center',
            flexWrap: getBooleanProp('wrap') ? 'wrap' : 'nowrap',
            gap: getNumberProp('gap') ?? 8,
          })}
        />
      </DropArea>
    );
  });

  registry.set('Space', (ctx) => {
    const {
      data, onDropData, getStringProp, getNumberProp, getBooleanProp, mergeStyle,
      handleActivateSelf, isNodeActive,
      spaceDirection, isSpaceSplitEnabled, spaceSplitLayout,
      spaceSplitDashed, spaceSplitAlign, spaceSplitContent,
    } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <SpaceContent
          align={getStringProp('align')}
          direction={spaceDirection}
          size={getNumberProp('size')}
          breakLine={getBooleanProp('breakLine')}
          isSpaceSplitEnabled={isSpaceSplitEnabled}
          spaceSplitLayout={spaceSplitLayout}
          spaceSplitDashed={spaceSplitDashed}
          spaceSplitAlign={spaceSplitAlign}
          spaceSplitContent={spaceSplitContent}
          style={mergeStyle()}
          onActivate={handleActivateSelf}
          nodeKey={data?.key}
          active={isNodeActive}
        />
      </DropArea>
    );
  });

  registry.set('Grid.Row', (ctx) => {
    const { data, onDropData, getStringProp, getNumberProp, mergeStyle } = ctx;
    return (
      <DropArea style={mergeStyle({ width: '100%' })} data={data} onDropData={onDropData}>
        <RowContent
          align={getStringProp('align')}
          justify={getStringProp('justify')}
          gutter={getNumberProp('gutter')}
          style={undefined}
        />
      </DropArea>
    );
  });

  registry.set('Grid.Col', (ctx) => {
    const { data, onDropData, mergeStyle, responsiveColLayout } = ctx;
    return (
      <Col span={responsiveColLayout.span} offset={responsiveColLayout.offset} style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Col>
    );
  });

  registry.set('Layout', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <BuilderLayoutRoot style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('Layout.Header', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <BuilderLayoutHeaderRoot style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('Layout.Content', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <BuilderLayoutContentRoot style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('Layout.Aside', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <BuilderLayoutAsideRoot style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('Layout.Footer', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <BuilderLayoutFooterRoot style={mergeStyle()} />
      </DropArea>
    );
  });

  /**
   * 吸附边界：原生 position: sticky。
   * 不用 TDesign Affix（内部 position: fixed 在 contain: layout 的模拟器内退化成 absolute，吸不住）。
   */
  registry.set('StickyBoundary', (ctx) => {
    const { data, onDropData, getStringProp, getNumberProp, getBooleanProp, mergeStyle } = ctx;
    const overflowRaw = getStringProp('overflow')?.trim();
    const overflow = (overflowRaw === 'visible'
      || overflowRaw === 'hidden'
      || overflowRaw === 'auto'
      || overflowRaw === 'scroll'
      || overflowRaw === 'clip'
      ? overflowRaw
      : 'visible') as React.CSSProperties['overflow'];
    const minHeight = getNumberProp('minHeight');
    const affixEnabled = getBooleanProp('affix') !== false;
    const offsetTop = getNumberProp('offsetTop') ?? 0;
    const zRaw = getNumberProp('zIndex');
    const zIndex = typeof zRaw === 'number' && !Number.isNaN(zRaw) ? zRaw : 500;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <StickyBoundaryHost
          affix={affixEnabled}
          offsetTop={offsetTop}
          zIndex={zIndex}
          overflow={overflow}
          minHeight={typeof minHeight === 'number' && minHeight > 0 ? minHeight : undefined}
          mergeStyle={mergeStyle}
        />
      </DropArea>
    );
  });

  registry.set('RouteOutlet', (ctx) => {
    const { data, onDropData, getNumberProp, getBooleanProp, mergeStyle } = ctx;
    const minHeight = Number(getNumberProp('minHeight')) || 360;
    const borderless = getBooleanProp('borderless');
    return (
      <div
        className="builder-route-outlet"
        style={mergeStyle({
          minHeight,
          display: 'flex',
          flexDirection: 'column',
          border: borderless ? 'none' : '1px dashed #9aa6b2',
          borderRadius: 8,
          background: '#fff',
          boxSizing: 'border-box',
        })}
      >
        <DropArea className="drop-area--route-outlet" style={{ flex: 1, minHeight: 0 }} data={data} onDropData={onDropData} emptyText="拖拽当前路由页面组件到路由出口" />
      </div>
    );
  });
}

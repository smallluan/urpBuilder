import { Col, Layout } from 'tdesign-react';
import type { ComponentRegistry } from '../componentContext';
import { SpaceContent, RowContent } from '../componentHelpers';
import DropArea from '../../../components/DropArea';

const { Header, Content, Aside, Footer } = Layout;

export function registerLayoutComponents(registry: ComponentRegistry): void {
  registry.set('Space', (ctx) => {
    const {
      data, onDropData, getStringProp, getNumberProp, getBooleanProp, mergeStyle,
      handleActivateSelf, isNodeActive,
      spaceDirection, isSpaceSplitEnabled, spaceSplitLayout,
      spaceSplitDashed, spaceSplitAlign, spaceSplitContent,
    } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData} style={mergeStyle()}>
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
      <Layout style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Layout>
    );
  });

  registry.set('Layout.Header', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <Header style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Header>
    );
  });

  registry.set('Layout.Content', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <Content style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Content>
    );
  });

  registry.set('Layout.Aside', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <Aside style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Aside>
    );
  });

  registry.set('Layout.Footer', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <Footer style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Footer>
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

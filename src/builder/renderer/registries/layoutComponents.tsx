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
      <DropArea style={{ width: '100%' }} data={data} onDropData={onDropData}>
        <RowContent
          align={getStringProp('align')}
          justify={getStringProp('justify')}
          gutter={getNumberProp('gutter')}
          style={mergeStyle()}
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
}

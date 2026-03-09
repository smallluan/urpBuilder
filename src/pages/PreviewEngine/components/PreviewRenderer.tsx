import React from 'react';
import { Avatar, Button, Card, Col, Divider, Image, Row, Space, Typography } from 'tdesign-react';
import type { UiTreeNode } from '../../CreateComponent/store/type';

interface PreviewRendererProps {
  node: UiTreeNode;
}

const getProp = (node: UiTreeNode, propName: string) => {
  const prop = node?.props?.[propName] as { value?: unknown } | undefined;
  return prop?.value;
};

const getNumberProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  return typeof value === 'number' ? value : undefined;
};

const getStringProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  return typeof value === 'string' ? value : undefined;
};

const getBooleanProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  return typeof value === 'boolean' ? value : undefined;
};

const getStyleProp = (node: UiTreeNode) => {
  const value = getProp(node, '__style');
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as React.CSSProperties;
};

const renderChildren = (node?: UiTreeNode) => {
  return node?.children?.map((child) => <PreviewRenderer key={child.key} node={child} />) ?? null;
};

const PreviewRenderer: React.FC<PreviewRendererProps> = ({ node }) => {
  const inlineStyle = getStyleProp(node);
  const type = node.type;

  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) {
      return undefined;
    }

    return {
      ...(baseStyle ?? {}),
      ...(inlineStyle ?? {}),
    };
  };

  switch (type) {
    case 'Button': {
      const isBlockButton = getBooleanProp(node, 'block') === true;
      return (
        <div style={mergeStyle(isBlockButton ? { width: '100%' } : undefined)}>
          <Button
            theme={getStringProp(node, 'theme') as any}
            shape={getStringProp(node, 'shape') as any}
            size={getStringProp(node, 'size') as any}
            variant={getStringProp(node, 'variant') as any}
            block={isBlockButton}
            style={mergeStyle(isBlockButton ? { width: '100%', display: 'flex' } : undefined)}
          >
            {getStringProp(node, 'content')}
          </Button>
        </div>
      );
    }
    case 'Space': {
      const direction = getStringProp(node, 'direction') as 'horizontal' | 'vertical' | undefined;
      const isSpaceSplitEnabled = getBooleanProp(node, 'splitEnabled') === true;
      const spaceSplitLayout = direction === 'vertical' ? 'horizontal' : 'vertical';
      const spaceSplitContent = getStringProp(node, 'splitContent');
      const spaceSplitAlign = getStringProp(node, 'splitAlign') as any;
      const spaceSplitDashed = getBooleanProp(node, 'splitDashed');
      const childrenList = renderChildren(node);
      const childrenArray = React.Children.toArray(childrenList);

      if (!isSpaceSplitEnabled || childrenArray.length <= 1) {
        return (
          <div style={mergeStyle()}>
            <Space
              align={getStringProp(node, 'align') as any}
              direction={direction as any}
              size={getNumberProp(node, 'size')}
              breakLine={getBooleanProp(node, 'breakLine')}
            >
              {childrenList}
            </Space>
          </div>
        );
      }

      const mergedChildren: React.ReactNode[] = [];
      childrenArray.forEach((child, index) => {
        mergedChildren.push(child);

        if (index < childrenArray.length - 1) {
          mergedChildren.push(
            <Divider
              key={`space-split-${node.key}-${index}`}
              layout={spaceSplitLayout as any}
              dashed={spaceSplitDashed}
              align={spaceSplitAlign}
              content={spaceSplitLayout === 'horizontal' ? spaceSplitContent : undefined}
            />,
          );
        }
      });

      return (
        <div style={mergeStyle()}>
          <Space
            align={getStringProp(node, 'align') as any}
            direction={direction as any}
            size={getNumberProp(node, 'size')}
            breakLine={getBooleanProp(node, 'breakLine')}
          >
            {mergedChildren}
          </Space>
        </div>
      );
    }
    case 'Grid.Row':
      return (
        <div style={mergeStyle()}>
          <Row
            align={getStringProp(node, 'align') as any}
            justify={getStringProp(node, 'justify') as any}
            gutter={getNumberProp(node, 'gutter')}
          >
            {renderChildren(node)}
          </Row>
        </div>
      );
    case 'Grid.Col':
      return (
        <div style={mergeStyle()}>
          <Col span={getNumberProp(node, 'span')} offset={getNumberProp(node, 'offset')}>
            {renderChildren(node)}
          </Col>
        </div>
      );
    case 'Card':
      return (
        <div style={mergeStyle()}>
          <Card
            title={getStringProp(node, 'title')}
            subtitle={getStringProp(node, 'subtitle')}
            size={getStringProp(node, 'size') as any}
            bordered={getBooleanProp(node, 'bordered')}
            headerBordered={getBooleanProp(node, 'headerBordered')}
            shadow={getBooleanProp(node, 'shadow')}
            hoverShadow={getBooleanProp(node, 'hoverShadow')}
            style={mergeStyle()}
          >
            {renderChildren(node)}
          </Card>
        </div>
      );
    case 'Image':
      return (
        <div style={mergeStyle()}>
          <Image
            src={getStringProp(node, 'src')}
            alt={getStringProp(node, 'alt')}
            fit={getStringProp(node, 'fit') as any}
            shape={getStringProp(node, 'shape') as any}
            style={mergeStyle()}
          />
        </div>
      );
    case 'Avatar':
      return (
        <div style={mergeStyle()}>
          <Avatar
            image={getStringProp(node, 'image')}
            alt={getStringProp(node, 'alt')}
            content={getStringProp(node, 'content')}
            shape={getStringProp(node, 'shape') as any}
            size={getStringProp(node, 'size')}
            hideOnLoadFailed={getBooleanProp(node, 'hideOnLoadFailed')}
            style={mergeStyle()}
          />
        </div>
      );
    case 'Divider':
      return (
        <div style={mergeStyle()}>
          <Divider
            align={getStringProp(node, 'align') as any}
            dashed={getBooleanProp(node, 'dashed')}
            size={getNumberProp(node, 'size')}
            content={getStringProp(node, 'content')}
            style={mergeStyle()}
          />
        </div>
      );
    case 'Typography.Title':
      return (
        <div style={mergeStyle()}>
          <Typography.Title level={getStringProp(node, 'level') as any} style={mergeStyle()}>
            {getStringProp(node, 'content')}
          </Typography.Title>
        </div>
      );
    case 'Typography.Paragraph':
      return (
        <div style={mergeStyle()}>
          <Typography.Paragraph style={mergeStyle()}>
            {getStringProp(node, 'content')}
          </Typography.Paragraph>
        </div>
      );
    case 'Typography.Text':
      return (
        <div style={mergeStyle()}>
          <Typography.Text
            theme={getStringProp(node, 'theme') as any}
            strong={getBooleanProp(node, 'strong')}
            underline={getBooleanProp(node, 'underline')}
            delete={getBooleanProp(node, 'delete')}
            code={getBooleanProp(node, 'code')}
            mark={getBooleanProp(node, 'mark')}
            style={mergeStyle()}
          >
            {getStringProp(node, 'content')}
          </Typography.Text>
        </div>
      );
    default:
      return <>{renderChildren(node)}</>;
  }
};

export default React.memo(PreviewRenderer);

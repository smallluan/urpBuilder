import React from 'react';
import { Avatar, Button, Card, Col, Divider, Image, Row, Space, Typography } from 'tdesign-react';
import type { UiTreeNode } from '../../CreateComponent/store/type';

interface PreviewRendererProps {
  node: UiTreeNode;
  onLifecycle?: (componentKey: string, lifetime: string, payload?: unknown) => void;
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

const renderChildren = (
  node?: UiTreeNode,
  onLifecycle?: (componentKey: string, lifetime: string, payload?: unknown) => void,
) => {
  return node?.children?.map((child) => <PreviewRenderer key={child.key} node={child} onLifecycle={onLifecycle} />) ?? null;
};

const PreviewRenderer: React.FC<PreviewRendererProps> = ({ node, onLifecycle }) => {
  const inlineStyle = getStyleProp(node);
  const type = node.type;
  const lifetimes = Array.isArray(node.lifetimes) ? node.lifetimes.map((item) => String(item)) : [];
  const didUpdateReadyRef = React.useRef(false);

  const hasLifetime = React.useCallback(
    (lifetime: string) => lifetimes.includes(lifetime),
    [lifetimes],
  );

  React.useEffect(() => {
    if (!onLifecycle) {
      return;
    }

    if (hasLifetime('onInit')) {
      onLifecycle(node.key, 'onInit', { nodeType: node.type });
    }
    if (hasLifetime('onBeforeMount')) {
      onLifecycle(node.key, 'onBeforeMount', { nodeType: node.type });
    }
    if (hasLifetime('onMounted')) {
      onLifecycle(node.key, 'onMounted', { nodeType: node.type });
    }

    return () => {
      if (hasLifetime('onBeforeUnmount')) {
        onLifecycle(node.key, 'onBeforeUnmount', { nodeType: node.type });
      }
      if (hasLifetime('onUnmounted')) {
        onLifecycle(node.key, 'onUnmounted', { nodeType: node.type });
      }
    };
  }, [hasLifetime, node.key, node.type, onLifecycle]);

  React.useEffect(() => {
    if (!onLifecycle) {
      return;
    }

    if (!didUpdateReadyRef.current) {
      didUpdateReadyRef.current = true;
      return;
    }

    if (hasLifetime('onBeforeUpdate')) {
      onLifecycle(node.key, 'onBeforeUpdate', { nodeType: node.type });
    }
    if (hasLifetime('onUpdated')) {
      onLifecycle(node.key, 'onUpdated', { nodeType: node.type });
    }
  }, [hasLifetime, node.children, node.key, node.label, node.props, node.type, onLifecycle]);

  const visible = getBooleanProp(node, 'visible');
  if (visible === false) {
    return null;
  }

  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) {
      return undefined;
    }

    return {
      ...(baseStyle ?? {}),
      ...(inlineStyle ?? {}),
    };
  };

  const emitInteractionLifecycle = React.useCallback(
    (lifetime: string, payload?: unknown) => {
      if (!onLifecycle || !hasLifetime(lifetime)) {
        return;
      }

      onLifecycle(node.key, lifetime, {
        nodeType: node.type,
        ...(payload && typeof payload === 'object' ? payload : {}),
      });
    },
    [hasLifetime, node.key, node.type, onLifecycle],
  );

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
            onClick={() => emitInteractionLifecycle('onClick')}
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
      const childrenList = renderChildren(node, onLifecycle);
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
            {renderChildren(node, onLifecycle)}
          </Row>
        </div>
      );
    case 'Grid.Col':
      return (
        <div style={mergeStyle()}>
          <Col span={getNumberProp(node, 'span')} offset={getNumberProp(node, 'offset')}>
            {renderChildren(node, onLifecycle)}
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
            {renderChildren(node, onLifecycle)}
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
      return <>{renderChildren(node, onLifecycle)}</>;
  }
};

export default React.memo(PreviewRenderer);

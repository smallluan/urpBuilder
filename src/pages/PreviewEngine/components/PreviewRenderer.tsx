import React from 'react';
import { Avatar, Button, Card, Col, Divider, Image, Row, Space, Switch, Swiper, Typography } from 'tdesign-react';
import type { UiTreeNode } from '../../CreateComponent/store/type';
import { getNodeSlotKey, isSlotNode } from '../../CreateComponent/utils/slot';

interface PreviewRendererProps {
  node: UiTreeNode;
  onLifecycle?: (componentKey: string, lifetime: string, payload?: unknown) => void;
}

interface SwiperImageItem {
  src: string;
  fallback: string;
  lazy: boolean;
  objectFit: string;
  objectPosition: string;
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

const getTextProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
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

const getStringArrayProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,|，/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getSwiperImages = (node: UiTreeNode): SwiperImageItem[] => {
  const value = getProp(node, 'images');
  if (Array.isArray(value)) {
    return value
      .filter((item) => !!item && typeof item === 'object')
      .map((item) => {
        const record = item as Partial<SwiperImageItem>;
        return {
          src: String(record.src ?? '').trim(),
          fallback: String(record.fallback ?? '').trim(),
          lazy: typeof record.lazy === 'boolean' ? record.lazy : true,
          objectFit: String(record.objectFit ?? 'cover'),
          objectPosition: String(record.objectPosition ?? 'center'),
        };
      })
      .filter((item) => !!item.src);
  }

  return getStringArrayProp(node, 'images').map((src) => ({
    src,
    fallback: '',
    lazy: true,
    objectFit: 'cover',
    objectPosition: 'center',
  }));
};

const getSlotChildren = (node: UiTreeNode, slotKey: 'header' | 'body') => {
  const sourceChildren = node.children ?? [];
  const slotNode = sourceChildren.find((child) => getNodeSlotKey(child) === slotKey && isSlotNode(child));
  if (slotNode) {
    return slotNode.children ?? [];
  }

  // 兼容旧结构：没有影子插槽节点时，全部旧 children 视为 body。
  if (slotKey === 'body') {
    return sourceChildren.filter((child) => !isSlotNode(child));
  }

  return [];
};

const renderChildList = (
  children: UiTreeNode[],
  onLifecycle?: (componentKey: string, lifetime: string, payload?: unknown) => void,
) => {
  return children.map((child) => <PreviewRenderer key={child.key} node={child} onLifecycle={onLifecycle} />);
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
  if (isSlotNode(node)) {
    return null;
  }

  const isSwitchNode = type === 'Switch';
  const isSwitchControlled = isSwitchNode ? getBooleanProp(node, 'controlled') !== false : false;
  const controlledSwitchValue = isSwitchNode ? Boolean(getBooleanProp(node, 'value')) : false;
  const switchDefaultValue = isSwitchNode ? Boolean(getBooleanProp(node, 'defaultValue')) : false;
  const lifetimes = Array.isArray(node.lifetimes) ? node.lifetimes.map((item) => String(item)) : [];
  const didUpdateReadyRef = React.useRef(false);
  const [uncontrolledSwitchValue, setUncontrolledSwitchValue] = React.useState<boolean>(switchDefaultValue);
  const didInitControlledSwitchValueRef = React.useRef(false);
  const lastControlledSwitchValueRef = React.useRef<boolean | undefined>(undefined);
  const suppressNextControlledPropEventRef = React.useRef(false);
  const expectedControlledSwitchValueRef = React.useRef<boolean | undefined>(undefined);

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

  React.useEffect(() => {
    if (!isSwitchNode) {
      setUncontrolledSwitchValue(false);
      didInitControlledSwitchValueRef.current = false;
      lastControlledSwitchValueRef.current = undefined;
      suppressNextControlledPropEventRef.current = false;
      expectedControlledSwitchValueRef.current = undefined;
      return;
    }

    if (!isSwitchControlled) {
      setUncontrolledSwitchValue(switchDefaultValue);
      didInitControlledSwitchValueRef.current = false;
      lastControlledSwitchValueRef.current = undefined;
      suppressNextControlledPropEventRef.current = false;
      expectedControlledSwitchValueRef.current = undefined;
      return;
    }

    if (!didInitControlledSwitchValueRef.current) {
      didInitControlledSwitchValueRef.current = true;
      lastControlledSwitchValueRef.current = controlledSwitchValue;
      return;
    }

    if (Object.is(lastControlledSwitchValueRef.current, controlledSwitchValue)) {
      return;
    }

    if (
      suppressNextControlledPropEventRef.current
      && Object.is(expectedControlledSwitchValueRef.current, controlledSwitchValue)
    ) {
      suppressNextControlledPropEventRef.current = false;
      expectedControlledSwitchValueRef.current = undefined;
      lastControlledSwitchValueRef.current = controlledSwitchValue;
      return;
    }

    lastControlledSwitchValueRef.current = controlledSwitchValue;
    emitInteractionLifecycle('onChange', {
      value: controlledSwitchValue,
      source: 'propChange',
      controlMode: 'controlled',
    });
  }, [
    controlledSwitchValue,
    emitInteractionLifecycle,
    isSwitchControlled,
    isSwitchNode,
    switchDefaultValue,
  ]);

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
            {getTextProp(node, 'content')}
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
          <Col span={getNumberProp(node, 'span') ?? 6} offset={getNumberProp(node, 'offset')}>
            {renderChildren(node, onLifecycle)}
          </Col>
        </div>
      );
    case 'Card':
      {
      const headerChildren = getSlotChildren(node, 'header');
      const bodyChildren = getSlotChildren(node, 'body');
      return (
        <div style={mergeStyle()}>
          <Card
            header={headerChildren.length > 0 ? renderChildList(headerChildren, onLifecycle) : undefined}
            title={headerChildren.length > 0 ? undefined : getStringProp(node, 'title')}
            subtitle={headerChildren.length > 0 ? undefined : getStringProp(node, 'subtitle')}
            size={getStringProp(node, 'size') as any}
            bordered={getBooleanProp(node, 'bordered')}
            headerBordered={getBooleanProp(node, 'headerBordered')}
            shadow={getBooleanProp(node, 'shadow')}
            hoverShadow={getBooleanProp(node, 'hoverShadow')}
            style={mergeStyle()}
          >
            {renderChildList(bodyChildren, onLifecycle)}
          </Card>
        </div>
      );
      }
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
    case 'Switch':
      {
      const renderedSwitchValue = isSwitchControlled ? controlledSwitchValue : uncontrolledSwitchValue;
      return (
        <div style={mergeStyle()}>
          <Space align="center" size={8}>
            <Switch
              size={getStringProp(node, 'size') as any}
              value={isSwitchControlled ? renderedSwitchValue : undefined}
              defaultValue={isSwitchControlled ? undefined : switchDefaultValue}
              onChange={(nextValue) => {
                const normalizedValue = Boolean(nextValue);
                if (isSwitchControlled) {
                  didInitControlledSwitchValueRef.current = true;
                  lastControlledSwitchValueRef.current = normalizedValue;
                  suppressNextControlledPropEventRef.current = true;
                  expectedControlledSwitchValueRef.current = normalizedValue;
                } else {
                  setUncontrolledSwitchValue(normalizedValue);
                }

                emitInteractionLifecycle('onChange', {
                  value: normalizedValue,
                  source: 'userInput',
                  controlMode: isSwitchControlled ? 'controlled' : 'uncontrolled',
                });
              }}
            />
          </Space>
        </div>
      );
      }
    case 'Swiper': {
      const imageList = getSwiperImages(node);
      const height = getNumberProp(node, 'height') ?? 240;

      if (imageList.length === 0) {
        return null;
      }

      return (
        <div style={mergeStyle()}>
          <Swiper autoplay height={height} style={{ width: '100%' }}>
            {imageList.map((imageItem, index) => (
              <div key={`${node.key}-swiper-${index}`} style={{ width: '100%', height: '100%' }}>
                <Image
                  src={imageItem.src}
                  fallback={imageItem.fallback || undefined}
                  lazy={imageItem.lazy}
                  fit={imageItem.objectFit as any}
                  style={{ width: '100%', height: '100%', objectPosition: imageItem.objectPosition }}
                />
              </div>
            ))}
          </Swiper>
        </div>
      );
    }
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
            {getTextProp(node, 'content')}
          </Typography.Title>
        </div>
      );
    case 'Typography.Paragraph':
      return (
        <div style={mergeStyle()}>
          <Typography.Paragraph style={mergeStyle()}>
            {getTextProp(node, 'content')}
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
            {getTextProp(node, 'content')}
          </Typography.Text>
        </div>
      );
    default:
      return <>{renderChildren(node, onLifecycle)}</>;
  }
};

export default React.memo(PreviewRenderer);

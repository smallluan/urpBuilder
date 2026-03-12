import React from 'react';
import { Avatar, Button, Card, Col, Divider, Image, Row, Space, Switch, Swiper, Typography, Layout, Calendar, ColorPicker, TimePicker, TimeRangePicker, InputNumber, Slider, Steps, List } from 'tdesign-react';
import type { UiTreeNode } from '../../CreateComponent/store/type';
import { getNodeSlotKey, isSlotNode } from '../../CreateComponent/utils/slot';
import { convertResponsiveConfigToTDesignProps, normalizeResponsiveConfig } from '../../CreateComponent/utils/gridResponsive';
import type { ComponentLifecycleHandler, ListRecord, SwiperImageItem } from '../../../types/component';
import { CORE_LIFETIMES, LIST_PREVIEW_DATA } from '../../../constants/componentBuilder';

interface PreviewRendererProps {
  node: UiTreeNode;
  onLifecycle?: ComponentLifecycleHandler;
}

const getProp = (node: UiTreeNode, propName: string) => {
  const prop = node?.props?.[propName] as { value?: unknown } | undefined;
  return prop?.value;
};

const getNumberProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  return typeof value === 'number' ? value : undefined;
};

const getGridNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
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

const getCalendarValueProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (value instanceof Date) {
    return value;
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

const getTimeStepsProp = (node: UiTreeNode) => {
  const value = getProp(node, 'steps');
  const toValidStep = (input: unknown) => {
    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }
    return Math.max(1, Math.round(parsed));
  };

  if (Array.isArray(value)) {
    const list = value.slice(0, 3).map((item) => toValidStep(item));
    if (list.length === 3) {
      return list;
    }
    return [1, 1, 1];
  }

  if (typeof value === 'string') {
    const list = value
      .split(/,|，|\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((item) => toValidStep(item));

    if (list.length === 3) {
      return list;
    }
  }

  return [1, 1, 1];
};

const getTimeRangeValueProp = (node: UiTreeNode, propName: string) => {
  const values = getStringArrayProp(node, propName).slice(0, 2);
  if (values.length === 2) {
    return values;
  }

  return undefined;
};

const getInputNumberValueProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  return undefined;
};

const getFiniteNumberProp = (node: UiTreeNode, propName: string) => {
  const value = getProp(node, propName);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getSliderValueProp = (node: UiTreeNode, propName: string): number | [number, number] | undefined => {
  const value = getProp(node, propName);
  const parseNumber = (input: unknown) => {
    if (typeof input === 'number' && Number.isFinite(input)) {
      return input;
    }

    if (typeof input === 'string' && input.trim()) {
      const parsed = Number(input);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  };

  const parseArrayValue = (list: unknown[]) => {
    const numbers = list.map((item) => parseNumber(item)).filter((item): item is number => typeof item === 'number');
    if (numbers.length >= 2) {
      return [numbers[0], numbers[1]] as [number, number];
    }

    if (numbers.length === 1) {
      return [numbers[0], numbers[0]] as [number, number];
    }

    return undefined;
  };

  if (Array.isArray(value)) {
    return parseArrayValue(value);
  }

  const numberValue = parseNumber(value);
  if (typeof numberValue === 'number') {
    return numberValue;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parseArrayValue(parsed);
        }
      } catch {
        return undefined;
      }
    }

    const chunks = text
      .split(/,|，|\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (chunks.length >= 2) {
      return parseArrayValue(chunks);
    }
  }

  return undefined;
};

const getStepsCurrentProp = (node: UiTreeNode, propName: string): string | number | undefined => {
  const value = getProp(node, propName);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
  }

  return undefined;
};

const getListDataSource = (node: UiTreeNode): ListRecord[] => {
  const value = getProp(node, 'dataSource');
  if (Array.isArray(value)) {
    const arrayValue = value.filter((item) => !!item && typeof item === 'object') as ListRecord[];
    return arrayValue.length ? arrayValue : LIST_PREVIEW_DATA;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const arrayValue = parsed.filter((item) => !!item && typeof item === 'object') as ListRecord[];
        return arrayValue.length ? arrayValue : LIST_PREVIEW_DATA;
      }
    } catch {
      return LIST_PREVIEW_DATA;
    }
  }

  return LIST_PREVIEW_DATA;
};

const getListFieldValue = (record: ListRecord, fieldPath?: string): string | undefined => {
  if (!fieldPath) {
    return undefined;
  }

  const path = fieldPath.trim();
  if (!path) {
    return undefined;
  }

  const value = path.split('.').reduce<unknown>((current, segment) => {
    if (!segment) {
      return current;
    }

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, record);

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
};

const getListFieldRawValue = (record: ListRecord, fieldPath?: string): unknown => {
  if (!fieldPath) {
    return undefined;
  }

  const path = fieldPath.trim();
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!segment) {
      return current;
    }

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, record);
};

const applyListBindingToNode = (node: UiTreeNode, item: ListRecord): UiTreeNode => {
  const nextNode: UiTreeNode = {
    ...node,
    props: {
      ...(node.props ?? {}),
    },
    children: (node.children ?? []).map((child) => applyListBindingToNode(child, item)),
  };

  const binding = (node.props?.__listBinding as { value?: unknown } | undefined)?.value as
    | { prop?: string; field?: string }
    | undefined;

  const bindProp = typeof binding?.prop === 'string' ? binding.prop.trim() : '';
  const bindField = typeof binding?.field === 'string' ? binding.field.trim() : '';
  if (!bindProp || !bindField) {
    return nextNode;
  }

  const rawBoundValue = getListFieldRawValue(item, bindField);
  if (typeof rawBoundValue === 'undefined') {
    return nextNode;
  }

  const targetProp = (nextNode.props?.[bindProp] ?? {}) as Record<string, unknown>;
  nextNode.props = {
    ...(nextNode.props ?? {}),
    [bindProp]: {
      ...targetProp,
      value: rawBoundValue,
    },
  };

  return nextNode;
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
  onLifecycle?: ComponentLifecycleHandler,
) => {
  return children.map((child) => (
    <PreviewRenderer
      key={child.key}
      node={child}
      onLifecycle={onLifecycle}
    />
  ));
};

const renderChildren = (
  node?: UiTreeNode,
  onLifecycle?: ComponentLifecycleHandler,
) => {
  return node?.children?.map((child) => (
    <PreviewRenderer
      key={child.key}
      node={child}
      onLifecycle={onLifecycle}
    />
  )) ?? null;
};

const PreviewRenderer: React.FC<PreviewRendererProps> = ({ node, onLifecycle }) => {
  const inlineStyle = getStyleProp(node);
  const type = typeof node.type === 'string' ? node.type.trim() : node.type;
  const { Header, Content, Aside, Footer } = Layout;
  const { ListItem, ListItemMeta } = List;
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
  const hasCoreLifetime = React.useCallback(
    (lifetime: string) => {
      if (hasLifetime(lifetime)) {
        return true;
      }

      if (lifetimes.length > 0) {
        return false;
      }

      return CORE_LIFETIMES.includes(lifetime);
    },
    [hasLifetime, lifetimes],
  );

  React.useEffect(() => {
    if (!onLifecycle) {
      return;
    }

    if (hasCoreLifetime('onInit')) {
      onLifecycle(node.key, 'onInit', { nodeType: node.type });
    }
    if (hasCoreLifetime('onBeforeMount')) {
      onLifecycle(node.key, 'onBeforeMount', { nodeType: node.type });
    }
    if (hasCoreLifetime('onMounted')) {
      onLifecycle(node.key, 'onMounted', { nodeType: node.type });
    }

    return () => {
      if (hasCoreLifetime('onBeforeUnmount')) {
        onLifecycle(node.key, 'onBeforeUnmount', { nodeType: node.type });
      }
      if (hasCoreLifetime('onUnmounted')) {
        onLifecycle(node.key, 'onUnmounted', { nodeType: node.type });
      }
    };
  }, [hasCoreLifetime, node.key, node.type, onLifecycle]);

  React.useEffect(() => {
    if (!onLifecycle) {
      return;
    }

    if (!didUpdateReadyRef.current) {
      didUpdateReadyRef.current = true;
      return;
    }

    if (hasCoreLifetime('onBeforeUpdate')) {
      onLifecycle(node.key, 'onBeforeUpdate', { nodeType: node.type });
    }
    if (hasCoreLifetime('onUpdated')) {
      onLifecycle(node.key, 'onUpdated', { nodeType: node.type });
    }
  }, [hasCoreLifetime, node.children, node.key, node.label, node.props, node.type, onLifecycle]);

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
      const canEmitInteraction =
        hasLifetime(lifetime)
        || (type === 'Slider' && lifetime === 'onChange' && lifetimes.length === 0);

      if (!onLifecycle || !canEmitInteraction) {
        return;
      }

      onLifecycle(node.key, lifetime, {
        nodeType: node.type,
        ...(payload && typeof payload === 'object' ? payload : {}),
      });
    },
    [hasLifetime, lifetimes.length, node.key, node.type, onLifecycle, type],
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
        <Row
          align={getStringProp(node, 'align') as any}
          justify={getStringProp(node, 'justify') as any}
          gutter={getNumberProp(node, 'gutter')}
          style={mergeStyle()}
        >
          {renderChildren(node, onLifecycle)}
        </Row>
      );
    case 'Grid.Col':
      {
      const baseSpan = getGridNumber(getProp(node, 'span')) ?? 6;
      const baseOffset = getGridNumber(getProp(node, 'offset')) ?? 0;
      const responsiveConfig = normalizeResponsiveConfig(getProp(node, '__responsiveCol'));
      const responsiveColProps = convertResponsiveConfigToTDesignProps(baseSpan, baseOffset, responsiveConfig);

      return (
        <Col span={baseSpan} offset={baseOffset} {...responsiveColProps} style={mergeStyle()}>
          {renderChildren(node, onLifecycle)}
        </Col>
      );
      }
    case 'List':
      {
      const customTemplateEnabled = getBooleanProp(node, 'customTemplateEnabled') === true;
      const listDataSource = getListDataSource(node);
      const listItemTemplateNode = (node.children ?? []).find((child) => child.type === 'List.Item');
      const getListItemTemplateProp = (propName: string) => {
        const prop = listItemTemplateNode?.props?.[propName] as { value?: unknown } | undefined;
        return prop?.value;
      };
      const titleField = getStringProp(node, 'titleField') || 'title';
      const descriptionField = getStringProp(node, 'descriptionField') || 'description';
      const imageField = getStringProp(node, 'imageField') || 'image';
      const actionField = getStringProp(node, 'actionField') || 'actionText';
      const showImage = getListItemTemplateProp('showImage') !== false;
      const showDescription = getListItemTemplateProp('showDescription') !== false;
      const showAction = getListItemTemplateProp('showAction') !== false;
      const actionTheme = String(getListItemTemplateProp('actionTheme') ?? 'default');
      const actionVariant = String(getListItemTemplateProp('actionVariant') ?? 'text');
      const actionSize = String(getListItemTemplateProp('actionSize') ?? 'small');

      if (customTemplateEnabled) {
        return (
          <div style={mergeStyle()}>
            <List
              layout={getStringProp(node, 'layout') as any}
              size={getStringProp(node, 'size') as any}
              split={getBooleanProp(node, 'split')}
              stripe={getBooleanProp(node, 'stripe')}
              header={getStringProp(node, 'header') || undefined}
              footer={getStringProp(node, 'footer') || undefined}
              asyncLoading={getStringProp(node, 'asyncLoading') || undefined}
              onLoadMore={(options) => emitInteractionLifecycle('onLoadMore', options)}
              onScroll={(options) => emitInteractionLifecycle('onScroll', options)}
              style={mergeStyle()}
            >
              {listDataSource.map((item, index) => {
                const itemRecord = (item && typeof item === 'object') ? (item as ListRecord) : {};
                const boundChildren = (listItemTemplateNode?.children ?? []).map((child) => applyListBindingToNode(child, itemRecord));

                return (
                  <ListItem key={`${node.key}-template-${index}`}>
                    <div onClick={() => emitInteractionLifecycle('onItemClick', { item, index })}>
                      {renderChildList(boundChildren, onLifecycle)}
                    </div>
                  </ListItem>
                );
              })}
            </List>
          </div>
        );
      }

      return (
        <div style={mergeStyle()}>
          <List
            layout={getStringProp(node, 'layout') as any}
            size={getStringProp(node, 'size') as any}
            split={getBooleanProp(node, 'split')}
            stripe={getBooleanProp(node, 'stripe')}
            header={getStringProp(node, 'header') || undefined}
            footer={getStringProp(node, 'footer') || undefined}
            asyncLoading={getStringProp(node, 'asyncLoading') || undefined}
            onLoadMore={(options) => emitInteractionLifecycle('onLoadMore', options)}
            onScroll={(options) => emitInteractionLifecycle('onScroll', options)}
            style={mergeStyle()}
          >
            {listDataSource.map((item, index) => {
              const itemRecord = (item && typeof item === 'object') ? (item as ListRecord) : {};
              const metaTitle = getListFieldValue(itemRecord, titleField);
              const metaDescription = getListFieldValue(itemRecord, descriptionField);
              const metaImage = getListFieldValue(itemRecord, imageField);
              const actionText = getListFieldValue(itemRecord, actionField);
              const resolvedTitle = metaTitle || `列表项 ${index + 1}`;
              const resolvedDescription = showDescription ? metaDescription : undefined;
              const resolvedImage = showImage ? metaImage : undefined;

              return (
                <ListItem
                  key={`${node.key}-item-${index}`}
                  action={showAction && actionText ? (
                    <Button
                      size={actionSize as any}
                      variant={actionVariant as any}
                      theme={actionTheme as any}
                      onClick={() => emitInteractionLifecycle('onActionClick', { item, index })}
                    >
                      {actionText}
                    </Button>
                  ) : undefined}
                >
                  <div onClick={() => emitInteractionLifecycle('onItemClick', { item, index })}>
                    <ListItemMeta
                      title={resolvedTitle}
                      description={resolvedDescription}
                      image={resolvedImage ? <Image src={resolvedImage} style={{ width: 56, height: 56, borderRadius: 6 }} /> : undefined}
                    />
                  </div>
                </ListItem>
              );
            })}
          </List>
        </div>
      );
      }
    case 'Layout':
      return (
        <div style={mergeStyle()}>
          <Layout>
            {renderChildren(node, onLifecycle)}
          </Layout>
        </div>
      );
    case 'Layout.Header':
      return (
        <div style={mergeStyle()}>
          <Header>
            {renderChildren(node, onLifecycle)}
          </Header>
        </div>
      );
    case 'Layout.Content':
      return (
        <div style={mergeStyle()}>
          <Content>
            {renderChildren(node, onLifecycle)}
          </Content>
        </div>
      );
    case 'Layout.Aside':
      return (
        <div style={mergeStyle()}>
          <Aside>
            {renderChildren(node, onLifecycle)}
          </Aside>
        </div>
      );
    case 'Layout.Footer':
      return (
        <div style={mergeStyle()}>
          <Footer>
            {renderChildren(node, onLifecycle)}
          </Footer>
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
    case 'Calendar':
      return (
        <div style={mergeStyle()}>
          <Calendar
            theme={getStringProp(node, 'theme') as any}
            mode={getStringProp(node, 'mode') as any}
            firstDayOfWeek={getNumberProp(node, 'firstDayOfWeek')}
            format={getStringProp(node, 'format')}
            fillWithZero={getBooleanProp(node, 'fillWithZero')}
            isShowWeekendDefault={getBooleanProp(node, 'isShowWeekendDefault')}
            controllerConfig={getBooleanProp(node, 'controllerConfig')}
            preventCellContextmenu={getBooleanProp(node, 'preventCellContextmenu')}
            value={getCalendarValueProp(node, 'value') as any}
            onCellClick={(options) => emitInteractionLifecycle('onCellClick', options)}
            onCellDoubleClick={(options) => emitInteractionLifecycle('onCellDoubleClick', options)}
            onCellRightClick={(options) => emitInteractionLifecycle('onCellRightClick', options)}
            onControllerChange={(options) => emitInteractionLifecycle('onControllerChange', options)}
            onMonthChange={(options) => emitInteractionLifecycle('onMonthChange', options)}
            style={mergeStyle()}
          />
        </div>
      );
    case 'ColorPicker':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      return (
        <div style={mergeStyle()}>
          <ColorPicker
            format={getStringProp(node, 'format') as any}
            value={isControlled ? (getStringProp(node, 'value') || undefined) : undefined}
            defaultValue={isControlled ? undefined : (getStringProp(node, 'defaultValue') || undefined)}
            clearable={getBooleanProp(node, 'clearable')}
            borderless={getBooleanProp(node, 'borderless')}
            disabled={getBooleanProp(node, 'disabled')}
            enableAlpha={getBooleanProp(node, 'enableAlpha')}
            showPrimaryColorPreview={getBooleanProp(node, 'showPrimaryColorPreview')}
            onChange={(value, context) => emitInteractionLifecycle('onChange', { value, context })}
            onClear={(context) => emitInteractionLifecycle('onClear', context)}
            onPaletteBarChange={(context) => emitInteractionLifecycle('onPaletteBarChange', context)}
            onRecentColorsChange={(value) => emitInteractionLifecycle('onRecentColorsChange', { value })}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'TimePicker':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;

      return (
        <div style={mergeStyle()}>
          <TimePicker
            format={getStringProp(node, 'format') || 'HH:mm:ss'}
            value={isControlled ? (getStringProp(node, 'value') || undefined) : undefined}
            defaultValue={isControlled ? undefined : (getStringProp(node, 'defaultValue') || undefined)}
            placeholder={getStringProp(node, 'placeholder') || undefined}
            size={getStringProp(node, 'size') as any}
            status={getStringProp(node, 'status') as any}
            steps={getTimeStepsProp(node) as any}
            allowInput={getBooleanProp(node, 'allowInput')}
            borderless={getBooleanProp(node, 'borderless')}
            clearable={getBooleanProp(node, 'clearable')}
            disabled={getBooleanProp(node, 'disabled')}
            hideDisabledTime={getBooleanProp(node, 'hideDisabledTime')}
            onBlur={(context) => emitInteractionLifecycle('onBlur', context)}
            onChange={(value) => emitInteractionLifecycle('onChange', { value })}
            onClear={(context) => emitInteractionLifecycle('onClear', context)}
            onClose={(context) => emitInteractionLifecycle('onClose', context)}
            onFocus={(context) => emitInteractionLifecycle('onFocus', context)}
            onInput={(context) => emitInteractionLifecycle('onInput', context)}
            onOpen={(context) => emitInteractionLifecycle('onOpen', context)}
            onPick={(value, context) => emitInteractionLifecycle('onPick', { value, context })}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'TimeRangePicker':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const value = getTimeRangeValueProp(node, 'value');
      const defaultValue = getTimeRangeValueProp(node, 'defaultValue');
      const placeholderStart = getStringProp(node, 'placeholderStart');
      const placeholderEnd = getStringProp(node, 'placeholderEnd');
      const placeholder = placeholderStart || placeholderEnd
        ? [placeholderStart || '开始时间', placeholderEnd || '结束时间']
        : undefined;

      return (
        <div style={mergeStyle()}>
          <TimeRangePicker
            format={getStringProp(node, 'format') || 'HH:mm:ss'}
            value={isControlled ? (value as any) : undefined}
            defaultValue={isControlled ? undefined : (defaultValue as any)}
            placeholder={placeholder as any}
            size={getStringProp(node, 'size') as any}
            status={getStringProp(node, 'status') as any}
            steps={getTimeStepsProp(node) as any}
            allowInput={getBooleanProp(node, 'allowInput')}
            autoSwap={getBooleanProp(node, 'autoSwap')}
            borderless={getBooleanProp(node, 'borderless')}
            clearable={getBooleanProp(node, 'clearable')}
            disabled={getBooleanProp(node, 'disabled')}
            hideDisabledTime={getBooleanProp(node, 'hideDisabledTime')}
            onBlur={(context) => emitInteractionLifecycle('onBlur', context)}
            onChange={(nextValue) => emitInteractionLifecycle('onChange', { value: nextValue })}
            onFocus={(context) => emitInteractionLifecycle('onFocus', context)}
            onInput={(context) => emitInteractionLifecycle('onInput', context)}
            onPick={(nextValue, context) => emitInteractionLifecycle('onPick', { value: nextValue, context })}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'InputNumber':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;

      return (
        <div style={mergeStyle()}>
          <InputNumber
            value={isControlled ? getInputNumberValueProp(node, 'value') as any : undefined}
            defaultValue={isControlled ? undefined : getInputNumberValueProp(node, 'defaultValue') as any}
            min={getInputNumberValueProp(node, 'min') as any}
            max={getInputNumberValueProp(node, 'max') as any}
            step={getInputNumberValueProp(node, 'step') as any}
            decimalPlaces={getFiniteNumberProp(node, 'decimalPlaces') as any}
            placeholder={getStringProp(node, 'placeholder') || undefined}
            size={getStringProp(node, 'size') as any}
            status={getStringProp(node, 'status') as any}
            align={getStringProp(node, 'align') as any}
            theme={getStringProp(node, 'theme') as any}
            allowInputOverLimit={getBooleanProp(node, 'allowInputOverLimit')}
            autoWidth={getBooleanProp(node, 'autoWidth')}
            disabled={getBooleanProp(node, 'disabled')}
            readOnly={getBooleanProp(node, 'readOnly')}
            largeNumber={getBooleanProp(node, 'largeNumber')}
            onBlur={(value, context) => emitInteractionLifecycle('onBlur', { value, context })}
            onChange={(value, context) => emitInteractionLifecycle('onChange', { value, context })}
            onEnter={(value, context) => emitInteractionLifecycle('onEnter', { value, context })}
            onFocus={(value, context) => emitInteractionLifecycle('onFocus', { value, context })}
            onKeydown={(value, context) => emitInteractionLifecycle('onKeydown', { value, context })}
            onKeypress={(value, context) => emitInteractionLifecycle('onKeypress', { value, context })}
            onKeyup={(value, context) => emitInteractionLifecycle('onKeyup', { value, context })}
            onValidate={(context) => emitInteractionLifecycle('onValidate', context)}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'Slider':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const isRange = getBooleanProp(node, 'range') === true;
      const min = getFiniteNumberProp(node, 'min') ?? 0;
      const max = getFiniteNumberProp(node, 'max') ?? 100;
      const rawValue = getSliderValueProp(node, 'value');
      const rawDefaultValue = getSliderValueProp(node, 'defaultValue');

      const value = isRange
        ? (Array.isArray(rawValue) ? rawValue : (typeof rawValue === 'number' ? [rawValue, rawValue] : [min, min]))
        : (Array.isArray(rawValue) ? rawValue[0] : (typeof rawValue === 'number' ? rawValue : min));

      const defaultValue = isRange
        ? (Array.isArray(rawDefaultValue) ? rawDefaultValue : (typeof rawDefaultValue === 'number' ? [rawDefaultValue, rawDefaultValue] : [min, min]))
        : (Array.isArray(rawDefaultValue) ? rawDefaultValue[0] : (typeof rawDefaultValue === 'number' ? rawDefaultValue : min));

      const sliderValueProps = isControlled
        ? { value: value as any }
        : { defaultValue: defaultValue as any };

      return (
        <div style={mergeStyle()}>
          <Slider
            {...sliderValueProps}
            layout={getStringProp(node, 'layout') as any}
            min={min}
            max={max}
            step={getFiniteNumberProp(node, 'step')}
            range={isRange}
            disabled={getBooleanProp(node, 'disabled')}
            onChange={(nextValue) => emitInteractionLifecycle('onChange', { value: nextValue })}
            style={mergeStyle()}
          />
        </div>
      );
      }
    case 'Steps':
      {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const current = getStepsCurrentProp(node, 'current');
      const defaultCurrent = getStepsCurrentProp(node, 'defaultCurrent');
      const stepItems = (node.children ?? [])
        .filter((child) => (typeof child.type === 'string' ? child.type.trim() : child.type) === 'Steps.Item')
        .map((child) => {
          const getStepProp = (propName: string) => {
            const prop = child.props?.[propName] as { value?: unknown } | undefined;
            return prop?.value;
          };

          const title = getStepProp('title');
          const content = getStepProp('content');
          const status = getStepProp('status');
          const value = getStepProp('value');
          const normalizedStatus =
            status === 'default' || status === 'process' || status === 'finish' || status === 'error'
              ? status
              : undefined;
          const normalizedValue =
            typeof value === 'number'
              ? value
              : (typeof value === 'string'
                ? (value.trim() ? value.trim() : undefined)
                : undefined);

          return {
            key: child.key,
            title: typeof title === 'string' ? title : '',
            content: typeof content === 'string' ? content : '',
            status: normalizedStatus,
            value: normalizedValue,
          };
        });

      const stepsValueProps = isControlled
        ? { current: current ?? 0 }
        : { defaultCurrent: defaultCurrent ?? 0 };

      const stepsLayout = getStringProp(node, 'layout') as 'horizontal' | 'vertical' | undefined;
      const fallbackMinHeight = stepsLayout === 'vertical' ? 160 : 88;

      return (
        <div style={mergeStyle()}>
          <Steps
            {...stepsValueProps}
            layout={stepsLayout as any}
            readOnly={getBooleanProp(node, 'readOnly')}
            separator={getStringProp(node, 'separator') as any}
            sequence={getStringProp(node, 'sequence') as any}
            theme={getStringProp(node, 'theme') as any}
            onChange={(currentValue, previousValue, context) =>
              emitInteractionLifecycle('onChange', {
                current: currentValue,
                previous: previousValue,
                context,
              })
            }
            style={mergeStyle({ minHeight: fallbackMinHeight })}
          >
            {stepItems.map((item) => (
              <Steps.StepItem
                key={item.key}
                title={item.title}
                content={item.content}
                status={item.status as any}
                value={item.value as any}
              />
            ))}
          </Steps>
        </div>
      );
      }
    case 'Steps.Item':
      return null;
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
              <Swiper.SwiperItem key={`${node.key}-swiper-${index}`}>
                <div style={{ width: '100%', height: '100%' }}>
                  <Image
                    src={imageItem.src}
                    fallback={imageItem.fallback || undefined}
                    lazy={imageItem.lazy}
                    fit={imageItem.objectFit as any}
                    style={{ width: '100%', height: '100%', objectPosition: imageItem.objectPosition }}
                  />
                </div>
              </Swiper.SwiperItem>
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

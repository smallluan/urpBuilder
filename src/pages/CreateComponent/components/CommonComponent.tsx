import React from 'react';
import { Button, Space, Row, Col, Card, Divider, Typography, Image, Avatar, Switch, Swiper, Layout, Calendar, ColorPicker } from 'tdesign-react';
import DropArea from '../../../components/DropArea';
import type { UiTreeNode } from '../store/type';
import { useCreateComponentStore } from '../store';
import { getNodeSlotKey, isSlotNode } from '../utils/slot';

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: (dropData: unknown, parent: UiTreeNode | undefined, options?: { slotKey?: string }) => void;
}

interface SwiperImageItem {
  src: string;
  fallback: string;
  lazy: boolean;
  objectFit: string;
  objectPosition: string;
}

interface ActivateWrapperProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
}

const ActivateWrapper: React.FC<ActivateWrapperProps> = ({ children, style, onActivate }) => (
  <div style={style} onClick={onActivate}>
    {children}
  </div>
);

interface SpaceContentProps {
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
}

const SpaceContent: React.FC<SpaceContentProps> = ({
  children,
  align,
  direction,
  size,
  breakLine,
  isSpaceSplitEnabled,
  spaceSplitLayout,
  spaceSplitDashed,
  spaceSplitAlign,
  spaceSplitContent,
  style,
  onActivate,
}) => {
  const childrenList = React.Children.toArray(children);

  if (!isSpaceSplitEnabled || childrenList.length <= 1) {
    return (
      <ActivateWrapper style={style} onActivate={onActivate}>
        <Space
          align={align as any}
          direction={direction as any}
          size={size}
          breakLine={breakLine}
        >
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
    <ActivateWrapper style={style} onActivate={onActivate}>
      <Space
        align={align as any}
        direction={direction as any}
        size={size}
        breakLine={breakLine}
      >
        {mergedChildren}
      </Space>
    </ActivateWrapper>
  );
};

interface RowContentProps {
  children?: React.ReactNode;
  align?: string;
  justify?: string;
  gutter?: number;
  style?: React.CSSProperties;
}

const RowContent: React.FC<RowContentProps> = ({ children, align, justify, gutter, style }) => (
  <Row
    align={align as any}
    justify={justify as any}
    gutter={gutter}
    style={style}
  >
    {children}
  </Row>
);

interface CardContentProps {
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
}

const CardContent: React.FC<CardContentProps> = ({
  children,
  header,
  title,
  subtitle,
  size,
  bordered,
  headerBordered,
  shadow,
  hoverShadow,
  style,
  onActivate,
}) => (
  <ActivateWrapper style={style} onActivate={onActivate}>
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

export default function CommonComponent(properties: CommonComponentProps) {
  const { type, data, onDropData } = properties;
  const setActiveNode = useCreateComponentStore((state) => state.setActiveNode);
  const { Header, Content, Aside, Footer } = Layout;

  const getProp = (propName: string) => {
    const prop = data?.props?.[propName] as { value?: unknown } | undefined;
    return prop?.value;
  };

  const getNumberProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'number' ? value : undefined;
  };

  const getStringProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'string' ? value : undefined;
  };

  const getBooleanProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'boolean' ? value : undefined;
  };

  const getCalendarValueProp = (propName: string) => {
    const value = getProp(propName);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    return undefined;
  };

  const getStyleProp = () => {
    const value = getProp('__style');
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as React.CSSProperties;
  };

  const getStringArrayProp = (propName: string) => {
    const value = getProp(propName);
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

  const getSwiperImages = (): SwiperImageItem[] => {
    const value = getProp('images');
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

    return getStringArrayProp('images').map((src) => ({
      src,
      fallback: '',
      lazy: true,
      objectFit: 'cover',
      objectPosition: 'center',
    }));
  };

  const handleActivateSelf = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!data?.key) {
      return;
    }

    setActiveNode(data.key);
  };

  const inlineStyle = getStyleProp();
  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) {
      return undefined;
    }

    return {
      ...(baseStyle ?? {}),
      ...(inlineStyle ?? {}),
    };
  };

  const isBlockButton = getBooleanProp('block') === true;
  const spaceDirection = getStringProp('direction') as 'horizontal' | 'vertical' | undefined;
  const isSpaceSplitEnabled = getBooleanProp('splitEnabled') === true;
  const spaceSplitLayout = spaceDirection === 'vertical' ? 'horizontal' : 'vertical';
  const spaceSplitContent = getStringProp('splitContent');
  const spaceSplitAlign = getStringProp('splitAlign') as any;
  const spaceSplitDashed = getBooleanProp('splitDashed');

  const toGridNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  };

  const colSpan = (() => {
    const resolved = toGridNumber(getProp('span'));
    if (typeof resolved !== 'number') {
      return 6;
    }
    return Math.max(1, Math.min(12, Math.round(resolved)));
  })();

  const colOffset = (() => {
    const resolved = toGridNumber(getProp('offset'));
    if (typeof resolved !== 'number') {
      return 0;
    }
    return Math.max(0, Math.min(11, Math.round(resolved)));
  })();

  if (isSlotNode(data)) {
    return (
      <DropArea data={data} onDropData={onDropData} emptyText="拖拽组件到此插槽" />
    );
  }

  const getCardSlotNode = (slotKey: 'header' | 'body') => {
    const sourceChildren = data?.children ?? [];
    return sourceChildren.find((child) => getNodeSlotKey(child) === slotKey);
  };

  const cardHeaderSlotNode = getCardSlotNode('header');
  const cardBodySlotNode = getCardSlotNode('body');
  const hasCardSlotStructure = Boolean(cardHeaderSlotNode && cardBodySlotNode);

  switch(type) {
    case 'Button':
      return (
        <ActivateWrapper style={mergeStyle(isBlockButton ? { width: '100%' } : undefined)} onActivate={handleActivateSelf}>
          <Button
            theme={getStringProp('theme') as any}
            shape={getStringProp('shape') as any}
            size={getStringProp('size') as any}
            variant={getStringProp('variant') as any}
            block={isBlockButton}
            style={mergeStyle(isBlockButton ? { width: '100%', display: 'flex' } : undefined)}
          >
            {getStringProp('content')}
          </Button>
        </ActivateWrapper>
      );
    case 'Space':
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
          />
        </DropArea>
      );
      case 'Grid.Row':
        return (
          <DropArea style={{ width: '100%' }} data={data} onDropData={onDropData}>
            <RowContent
              align={getStringProp('align')}
              justify={getStringProp('justify')}
              gutter={getNumberProp('gutter')}
              style={mergeStyle()}
            />
          </DropArea>
        )
      case 'Grid.Col':
        return (
          <Col
            span={colSpan}
            offset={colOffset}
            style={mergeStyle()}
          >
            <DropArea data={data} onDropData={onDropData}>

            </DropArea>
          </Col>

        )
      case 'Layout':
        return (
          <Layout style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Layout>
        )
      case 'Layout.Header':
        return (
          <Header style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Header>
        )
      case 'Layout.Content':
        return (
          <Content style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Content>
        )
      case 'Layout.Aside':
        return (
          <Aside style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Aside>
        )
      case 'Layout.Footer':
        return (
          <Footer style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Footer>
        )
      case 'Card':
        if (!hasCardSlotStructure) {
          return (
            <DropArea data={data} onDropData={onDropData}>
              <CardContent
                title={getStringProp('title')}
                subtitle={getStringProp('subtitle')}
                size={getStringProp('size')}
                bordered={getBooleanProp('bordered')}
                headerBordered={getBooleanProp('headerBordered')}
                shadow={getBooleanProp('shadow')}
                hoverShadow={getBooleanProp('hoverShadow')}
                style={mergeStyle()}
                onActivate={handleActivateSelf}
              />
            </DropArea>
          );
        }

        return (
          <CardContent
            title={!cardHeaderSlotNode?.children?.length ? getStringProp('title') : undefined}
            subtitle={!cardHeaderSlotNode?.children?.length ? getStringProp('subtitle') : undefined}
            size={getStringProp('size')}
            bordered={getBooleanProp('bordered')}
            headerBordered={getBooleanProp('headerBordered')}
            shadow={getBooleanProp('shadow')}
            hoverShadow={getBooleanProp('hoverShadow')}
            style={mergeStyle()}
            onActivate={handleActivateSelf}
            header={(
              <DropArea
                data={cardHeaderSlotNode}
                onDropData={onDropData}
                dropSlotKey="header"
                selectable={false}
                compactWhenFilled
                emptyText="拖拽组件到卡片头部"
              />
            )}
          >
            <DropArea
              data={cardBodySlotNode}
              onDropData={onDropData}
              dropSlotKey="body"
              selectable={false}
              compactWhenFilled
              emptyText="拖拽组件到卡片内容"
            />
          </CardContent>
        );
      case 'Image':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Image
              src={getStringProp('src')}
              alt={getStringProp('alt')}
              fit={getStringProp('fit') as any}
              shape={getStringProp('shape') as any}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'Avatar':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Avatar
              image={getStringProp('image')}
              alt={getStringProp('alt')}
              content={getStringProp('content')}
              shape={getStringProp('shape') as any}
              size={getStringProp('size')}
              hideOnLoadFailed={getBooleanProp('hideOnLoadFailed')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'Switch':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        const controlledValue = Boolean(getBooleanProp('value'));
        const defaultValue = Boolean(getBooleanProp('defaultValue'));
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Space align="center" size={8}>
              <Switch
                size={getStringProp('size') as any}
                value={isControlled ? controlledValue : undefined}
                defaultValue={isControlled ? undefined : defaultValue}
                onChange={() => {
                  // 搭建态仅展示，不在此处驱动运行时逻辑
                }}
              />
            </Space>
          </ActivateWrapper>
        );
        }
      case 'Calendar':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Calendar
              theme={getStringProp('theme') as any}
              mode={getStringProp('mode') as any}
              firstDayOfWeek={getNumberProp('firstDayOfWeek')}
              format={getStringProp('format')}
              fillWithZero={getBooleanProp('fillWithZero')}
              isShowWeekendDefault={getBooleanProp('isShowWeekendDefault')}
              controllerConfig={getBooleanProp('controllerConfig')}
              preventCellContextmenu={getBooleanProp('preventCellContextmenu')}
              value={getCalendarValueProp('value') as any}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'ColorPicker':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <ColorPicker
              format={getStringProp('format') as any}
              value={isControlled ? (getStringProp('value') || undefined) : undefined}
              defaultValue={isControlled ? undefined : (getStringProp('defaultValue') || undefined)}
              clearable={getBooleanProp('clearable')}
              borderless={getBooleanProp('borderless')}
              disabled={getBooleanProp('disabled')}
              enableAlpha={getBooleanProp('enableAlpha')}
              showPrimaryColorPreview={getBooleanProp('showPrimaryColorPreview')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
        }
      case 'Swiper': {
        const imageList = getSwiperImages();
        const height = getNumberProp('height') ?? 240;

        if (imageList.length === 0) {
          return null;
        }

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Swiper autoplay height={height} style={{ width: '100%' }}>
              {imageList.map((imageItem, index) => (
                <div key={`${data?.key ?? 'swiper'}-${index}`} style={{ width: '100%', height: '100%' }}>
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
          </ActivateWrapper>
        );
      }
      case 'Divider':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Divider
              align={getStringProp('align') as any}
              dashed={getBooleanProp('dashed')}
              size={getNumberProp('size')}
              content={getStringProp('content')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'Typography.Title':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Typography.Title level={getStringProp('level') as any} style={mergeStyle()}>
              {getStringProp('content')}
            </Typography.Title>
          </ActivateWrapper>
        );
      case 'Typography.Paragraph':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Typography.Paragraph style={mergeStyle()}>
              {getStringProp('content')}
            </Typography.Paragraph>
          </ActivateWrapper>
        );
      case 'Typography.Text':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Typography.Text
              theme={getStringProp('theme') as any}
              strong={getBooleanProp('strong')}
              underline={getBooleanProp('underline')}
              delete={getBooleanProp('delete')}
              code={getBooleanProp('code')}
              mark={getBooleanProp('mark')}
              style={mergeStyle()}
            >
              {getStringProp('content')}
            </Typography.Text>
          </ActivateWrapper>
        );
    default:
      return null;
  }
}

import React from 'react';
import { Button, Space, Row, Col, Card, Divider, Typography, Image, Avatar } from 'tdesign-react';
import DropArea from '../../../components/DropArea';
import type { UiTreeNode } from '../store/type';
import { useCreateComponentStore } from '../store';

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: (dropData: unknown, parent: UiTreeNode | undefined) => void;
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
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
}

const RowContent: React.FC<RowContentProps> = ({ children, align, justify, gutter, style, onActivate }) => (
  <ActivateWrapper style={style} onActivate={onActivate}>
    <Row
      align={align as any}
      justify={justify as any}
      gutter={gutter}
    >
      {children}
    </Row>
  </ActivateWrapper>
);

interface CardContentProps {
  children?: React.ReactNode;
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

  const getStyleProp = () => {
    const value = getProp('__style');
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as React.CSSProperties;
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
          <DropArea style={{width: '400px'}} data={data} onDropData={onDropData}>
            <RowContent
              align={getStringProp('align')}
              justify={getStringProp('justify')}
              gutter={getNumberProp('gutter')}
              style={mergeStyle()}
              onActivate={handleActivateSelf}
            />
          </DropArea>
        )
      case 'Grid.Col':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Col span={getNumberProp('span')} offset={getNumberProp('offset')}>
              <DropArea data={data} onDropData={onDropData}>
              
              </DropArea>
            </Col>
          </ActivateWrapper>
          
        )
      case 'Card':
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

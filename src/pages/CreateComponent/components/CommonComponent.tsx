import React from 'react';
import { Button, Space, Row, Col, Card, Divider, Typography } from 'tdesign-react';
import DropArea from '../../../components/DropArea';
import type { UiTreeNode } from '../store/type';
import { useCreateComponentStore } from '../store';

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: (dropData: unknown, parent: UiTreeNode | undefined) => void;
}

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

  const handleActivateSelf = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!data?.key) {
      return;
    }

    setActiveNode(data.key);
  };

  const ActivateWrapper: React.FC<{
    children: React.ReactNode;
    style?: React.CSSProperties;
  }> = ({ children, style }) => (
    <div style={style} onClick={handleActivateSelf}>
      {children}
    </div>
  );

  const isBlockButton = getBooleanProp('block') === true;
  const spaceDirection = getStringProp('direction') as 'horizontal' | 'vertical' | undefined;
  const isSpaceSplitEnabled = getBooleanProp('splitEnabled') === true;
  const spaceSplitLayout = spaceDirection === 'vertical' ? 'horizontal' : 'vertical';
  const spaceSplitContent = getStringProp('splitContent');
  const spaceSplitAlign = getStringProp('splitAlign') as any;
  const spaceSplitDashed = getBooleanProp('splitDashed');

  const SpaceContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const childrenList = React.Children.toArray(children);

    if (!isSpaceSplitEnabled || childrenList.length <= 1) {
      return (
        <Space
          align={getStringProp('align') as any}
          direction={spaceDirection as any}
          size={getNumberProp('size')}
          breakLine={getBooleanProp('breakLine')}
        >
          {children}
        </Space>
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
            align={spaceSplitAlign}
            content={spaceSplitLayout === 'horizontal' ? spaceSplitContent : undefined}
          />,
        );
      }
    });

    return (
      <Space
        align={getStringProp('align') as any}
        direction={spaceDirection as any}
        size={getNumberProp('size')}
        breakLine={getBooleanProp('breakLine')}
      >
        {mergedChildren}
      </Space>
    );
  };

  switch(type) {
    case 'Button':
      return (
        <ActivateWrapper style={isBlockButton ? { width: '100%' } : undefined}>
          <Button
            theme={getStringProp('theme') as any}
            shape={getStringProp('shape') as any}
            size={getStringProp('size') as any}
            variant={getStringProp('variant') as any}
            block={isBlockButton}
            style={isBlockButton ? { width: '100%', display: 'flex' } : undefined}
          >
            {getStringProp('content')}
          </Button>
        </ActivateWrapper>
      );
    case 'Space':
      return (
        <DropArea data={data} onDropData={onDropData}>
          <SpaceContent />
        </DropArea>
      );
      case 'Grid.Row':
        return (
          <DropArea style={{width: '400px'}} data={data} onDropData={onDropData}>
            <ActivateWrapper>
              <Row
                align={getStringProp('align') as any}
                justify={getStringProp('justify') as any}
                gutter={getNumberProp('gutter')}
              >
                {null}
              </Row>
            </ActivateWrapper>
          </DropArea>
        )
      case 'Grid.Col':
        return (
          <ActivateWrapper>
            <Col span={getNumberProp('span')} offset={getNumberProp('offset')}>
              <DropArea data={data} onDropData={onDropData}>
              
              </DropArea>
            </Col>
          </ActivateWrapper>
          
        )
      case 'Card':
        return (
          <DropArea data={data} onDropData={onDropData}>
            <ActivateWrapper>
              <Card
                title={getStringProp('title')}
                subtitle={getStringProp('subtitle')}
                theme={getStringProp('theme') as any}
                size={getStringProp('size') as any}
                bordered={getBooleanProp('bordered')}
                headerBordered={getBooleanProp('headerBordered')}
                shadow={getBooleanProp('shadow')}
                hoverShadow={getBooleanProp('hoverShadow')}
              />
            </ActivateWrapper>
          </DropArea>
        );
      case 'Divider':
        return (
          <ActivateWrapper>
            <Divider
              align={getStringProp('align') as any}
              dashed={getBooleanProp('dashed')}
              size={getNumberProp('size')}
              content={getStringProp('content')}
            />
          </ActivateWrapper>
        );
      case 'Typography.Title':
        return (
          <ActivateWrapper>
            <Typography.Title level={getStringProp('level') as any}>
              {getStringProp('content')}
            </Typography.Title>
          </ActivateWrapper>
        );
      case 'Typography.Paragraph':
        return (
          <ActivateWrapper>
            <Typography.Paragraph>
              {getStringProp('content')}
            </Typography.Paragraph>
          </ActivateWrapper>
        );
      case 'Typography.Text':
        return (
          <ActivateWrapper>
            <Typography.Text
              theme={getStringProp('theme') as any}
              strong={getBooleanProp('strong')}
              underline={getBooleanProp('underline')}
              delete={getBooleanProp('delete')}
              code={getBooleanProp('code')}
              mark={getBooleanProp('mark')}
            >
              {getStringProp('content')}
            </Typography.Text>
          </ActivateWrapper>
        );
    default:
      return null;
  }
}

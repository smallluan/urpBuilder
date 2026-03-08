import { Button, Space, Row, Col } from 'tdesign-react';
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
  const toggleActiveNode = useCreateComponentStore((state) => state.toggleActiveNode);

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

    toggleActiveNode(data.key);
  };

  const isBlockButton = getBooleanProp('block') === true;

  switch(type) {
    case 'Button':
      return (
        <Button
          theme={getStringProp('theme') as any}
          shape={getStringProp('shape') as any}
          size={getStringProp('size') as any}
          variant={getStringProp('variant') as any}
          block={isBlockButton}
          style={isBlockButton ? { width: '100%' } : undefined}
          content={getStringProp('content')}
          onClick={handleActivateSelf}
        />
      );
    case 'Space':
      return (
        <DropArea data={data} onDropData={onDropData}>
          <Space
            align={getStringProp('align') as any}
            direction={getStringProp('direction') as any}
            size={getNumberProp('size')}
            breakLine={getBooleanProp('breakLine')}
          />
        </DropArea>
      );
      case 'Grid.Row':
        return (
          <DropArea style={{width: '400px'}} data={data} onDropData={onDropData}>
            <Row
              align={getStringProp('align') as any}
              gutter={getNumberProp('gutter')}
            >
              {null}
            </Row>
          </DropArea>
        )
      case 'Grid.Col':
        return (
          <Col span={getNumberProp('span')}>
            <DropArea data={data} onDropData={onDropData}>
            
            </DropArea>
          </Col>
          
        )
    default:
      return null;
  }
}

import { Button, Space, Row, Col } from 'tdesign-react';
import DropArea from '../../../components/DropArea';
import type { UiTreeNode } from '../store/type';

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: (dropData: unknown, parent: UiTreeNode | undefined) => void;
}

export default function CommonComponent(properties: CommonComponentProps) {
  const { type, data, onDropData } = properties;

  const getProp = (propName: string) => {
    const prop = data?.props?.[propName] as { value?: unknown } | undefined;
    return prop?.value;
  };

  const getNumberProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'number' ? value : undefined;
  };

  switch(type) {
    case 'Button':
      return (
        <Button content={typeof getProp('content') === 'string' ? (getProp('content') as string) : undefined} />
      );
    case 'Space':
      return (
        <DropArea data={data} onDropData={onDropData}>
          <Space />
        </DropArea>
      );
      case 'Grid.Row':
        return (
          <DropArea style={{width: '400px'}} data={data} onDropData={onDropData}>
            <Row> </Row>
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

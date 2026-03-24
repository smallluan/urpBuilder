import React, { useState } from 'react';
import { Button, Drawer } from 'tdesign-react';
import { NodeStylePanel } from './NodeStylePanel';

interface NodeStyleDrawerProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  triggerRenderer?: (openDrawer: () => void) => React.ReactNode;
}

const NodeStyleDrawer: React.FC<NodeStyleDrawerProps> = ({
  value,
  onChange,
  targetKey,
  triggerRenderer,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      {triggerRenderer ? (
        triggerRenderer(() => setVisible(true))
      ) : (
        <Button size="small" variant="outline" onClick={() => setVisible(true)}>
          样式
        </Button>
      )}

      <Drawer
        visible={visible}
        header="CSS 样式编辑器"
        placement="right"
        size="720px"
        closeBtn
        destroyOnClose
        onClose={() => setVisible(false)}
      >
        <NodeStylePanel value={value} onChange={onChange} targetKey={targetKey} />
      </Drawer>
    </>
  );
};

export default React.memo(NodeStyleDrawer);

import React from 'react';
import { Hand, MousePointer2 } from 'lucide-react';
import UnifiedBuilderTopbar, { TopbarGroup, TopbarIconButton } from '../../components/UnifiedBuilderTopbar';

export type FlowCanvasTool = 'pan' | 'select';

interface FlowTopbarProps {
  readOnly: boolean;
  canvasTool: FlowCanvasTool;
  onCanvasToolChange: (tool: FlowCanvasTool) => void;
}

const FlowTopbar: React.FC<FlowTopbarProps> = ({ readOnly, canvasTool, onCanvasToolChange }) => (
  <UnifiedBuilderTopbar
    className="flow-topbar"
    left={(
      <TopbarGroup>
        <TopbarIconButton
          tip="平移画布（左键拖背景）"
          label="平移"
          icon={<Hand size={16} strokeWidth={2} />}
          active={canvasTool === 'pan'}
          disabled={readOnly}
          onClick={() => onCanvasToolChange('pan')}
        />
        <TopbarIconButton
          tip="框选节点（左键拖背景）；按住空格拖可平移画布"
          label="选择"
          icon={<MousePointer2 size={16} strokeWidth={2} />}
          active={canvasTool === 'select'}
          disabled={readOnly}
          onClick={() => onCanvasToolChange('select')}
        />
      </TopbarGroup>
    )}
  />
);

export default FlowTopbar;

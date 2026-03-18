import React from 'react';
import { Button, Empty } from 'tdesign-react';

interface WorkspaceModePanelProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

const WorkspaceModePanel: React.FC<WorkspaceModePanelProps> = ({ title, description, actionText, onAction }) => {
  return (
    <div>
      <h1>{title}</h1>
      <Empty description={description} />
      {actionText && onAction ? (
        <div style={{ marginTop: 12 }}>
          <Button size="small" theme="primary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default WorkspaceModePanel;

import React from 'react';
import { Radio } from 'tdesign-react';

export type RightPanelMode = 'library' | 'config';

interface RightPanelHeaderProps {
	mode: RightPanelMode;
	onChange: (mode: RightPanelMode) => void;
	libraryLabel?: string;
	configLabel?: string;
}

const RightPanelHeader: React.FC<RightPanelHeaderProps> = ({
	mode,
	onChange,
	libraryLabel = '组件库列表',
	configLabel = '组件配置',
}) => {
	return (
		<div className="right-panel-header">
			<Radio.Group
				variant="default-filled"
				value={mode === 'library' ? 'library' : 'config'}
				onChange={(value) => onChange(String(value) as RightPanelMode)}
			>
				<Radio.Button value="library">{libraryLabel}</Radio.Button>
				<Radio.Button value="config">{configLabel}</Radio.Button>
			</Radio.Group>
		</div>
	);
};

export default React.memo(RightPanelHeader);

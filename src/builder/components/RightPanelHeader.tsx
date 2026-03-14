import React from 'react';
import { Radio } from 'tdesign-react';

export type RightPanelMode = 'library' | 'saved' | 'config';

interface RightPanelHeaderProps {
	mode: RightPanelMode;
	onChange: (mode: RightPanelMode) => void;
	libraryLabel?: string;
	savedLabel?: string;
	configLabel?: string;
	showSaved?: boolean;
}

const RightPanelHeader: React.FC<RightPanelHeaderProps> = ({
	mode,
	onChange,
	libraryLabel = '组件库',
	savedLabel = '已保存',
	configLabel = '配置',
	showSaved = false,
}) => {
	return (
		<div className={`right-panel-header${showSaved ? ' right-panel-header--saved' : ''}`}>
			<Radio.Group
				variant="default-filled"
				value={mode}
				onChange={(value) => onChange(String(value) as RightPanelMode)}
			>
				<Radio.Button value="library">{libraryLabel}</Radio.Button>
				{showSaved ? <Radio.Button value="saved">{savedLabel}</Radio.Button> : null}
				<Radio.Button value="config">{configLabel}</Radio.Button>
			</Radio.Group>
		</div>
	);
};

export default React.memo(RightPanelHeader);

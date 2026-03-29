import React from 'react';
import { Tabs } from 'tdesign-react';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Package, Settings2 } from 'lucide-react';

export type RightPanelMode = 'library' | 'saved' | 'config';

function TabLabel({ Icon, text }: { Icon: LucideIcon; text: string }) {
	return (
		<span className="right-panel-tab-label">
			<Icon className="right-panel-tab-label__icon" size={14} strokeWidth={2} aria-hidden />
			<span className="right-panel-tab-label__text">{text}</span>
		</span>
	);
}

interface RightPanelHeaderProps {
	mode: RightPanelMode;
	onChange: (mode: RightPanelMode) => void;
	libraryLabel?: string;
	savedLabel?: string;
	configLabel?: string;
	showSaved?: boolean;
	libraryPanel: React.ReactNode;
	savedPanel?: React.ReactNode;
	configPanel: React.ReactNode;
}

const RightPanelHeader: React.FC<RightPanelHeaderProps> = ({
	mode,
	onChange,
	libraryLabel = '组件库',
	savedLabel = '已保存',
	configLabel = '配置',
	showSaved = false,
	libraryPanel,
	savedPanel,
	configPanel,
}) => {
	return (
		<div className="right-panel-tabs-wrap">
			<Tabs
				className="right-panel-tabs"
				theme="card"
				size="medium"
				value={mode}
				onChange={(value) => onChange(String(value) as RightPanelMode)}
			>
				<Tabs.TabPanel
					value="library"
					label={<TabLabel Icon={LayoutGrid} text={libraryLabel} />}
					destroyOnHide={false}
					lazy
				>
					{libraryPanel}
				</Tabs.TabPanel>
				{showSaved && savedPanel !== undefined ? (
					<Tabs.TabPanel
						value="saved"
						label={<TabLabel Icon={Package} text={savedLabel} />}
						destroyOnHide={false}
						lazy
					>
						{savedPanel}
					</Tabs.TabPanel>
				) : null}
				<Tabs.TabPanel
					value="config"
					label={<TabLabel Icon={Settings2} text={configLabel} />}
					destroyOnHide={false}
					lazy
				>
					{configPanel}
				</Tabs.TabPanel>
			</Tabs>
		</div>
	);
};

export default React.memo(RightPanelHeader);

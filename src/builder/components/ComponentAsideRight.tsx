import React, { useEffect, useMemo, useState } from 'react';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import ComponentConfigPanel from './ComponentConfigPanel';
import SavedComponentPanel from './SavedComponentPanel';
import RightPanelHeader, { type RightPanelMode } from './RightPanelHeader';
import { useBuilderContext } from '../context/BuilderContext';

const ComponentAsideRight: React.FC = () => {
	const { useStore } = useBuilderContext();
	const builderRightAsideWidthPx = useStore((state) => state.builderComponentRightAsideWidthPx);
	const builderRightAsideCollapsed = useStore((state) => state.builderComponentRightAsideCollapsed);
	const [selectedName, setSelectedName] = useState<string | null>(null);
	const [mode, setMode] = useState<RightPanelMode>('library');
	const activeNodeKey = useStore((state) => state.activeNodeKey);

	useEffect(() => {
		if (activeNodeKey) {
			setMode('config');
		} else {
			// 删除节点后无选中项时，避免停留在空的配置面板，回到组件库
			setMode('library');
		}
	}, [activeNodeKey]);

	const asideStyle = useMemo((): React.CSSProperties => {
		if (builderRightAsideCollapsed) {
			return { width: 0, minWidth: 0, flexShrink: 0, flexBasis: 0 };
		}
		return {
			width: builderRightAsideWidthPx,
			minWidth: 0,
			maxWidth: 300,
			flexBasis: builderRightAsideWidthPx,
			flexShrink: 0,
		};
	}, [builderRightAsideCollapsed, builderRightAsideWidthPx]);

	return (
		<aside
			className={`aside-right${builderRightAsideCollapsed ? ' aside-right--collapsed' : ''}`}
			style={asideStyle}
		>
			<RightPanelHeader
				mode={mode}
				onChange={setMode}
				showSaved
				savedLabel="自定义组件"
				libraryPanel={
					<div className="right-panel-library-shell">
						<ComponentLibraryPanel selectedName={selectedName} onSelect={setSelectedName} hideSavedComponents />
					</div>
				}
				savedPanel={
					<SavedComponentPanel selectedName={selectedName} onSelect={setSelectedName} active={mode === 'saved'} />
				}
				configPanel={<ComponentConfigPanel />}
			/>
		</aside>
	);
};

export default React.memo(ComponentAsideRight);

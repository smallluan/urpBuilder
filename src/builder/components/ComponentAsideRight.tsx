import React, { useEffect, useState } from 'react';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import ComponentConfigPanel from './ComponentConfigPanel';
import SavedComponentPanel from './SavedComponentPanel';
import RightPanelHeader, { type RightPanelMode } from './RightPanelHeader';
import { useBuilderContext } from '../context/BuilderContext';

const ComponentAsideRight: React.FC = () => {
	const { useStore } = useBuilderContext();
	const [selectedName, setSelectedName] = useState<string | null>(null);
	const [mode, setMode] = useState<RightPanelMode>('library');
	const activeNodeKey = useStore((state) => state.activeNodeKey);

	useEffect(() => {
		if (activeNodeKey) {
			setMode('config');
		}
	}, [activeNodeKey]);

	return (
		<aside className="aside-right">
			<RightPanelHeader
				mode={mode}
				onChange={setMode}
				showSaved
				savedLabel="自定义组件"
				libraryPanel={
					<ComponentLibraryPanel selectedName={selectedName} onSelect={setSelectedName} hideSavedComponents />
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

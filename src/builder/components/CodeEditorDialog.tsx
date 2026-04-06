import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Select, Space } from 'tdesign-react';
import { undo, redo } from '@codemirror/commands';
import type { Completion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import {
	CODE_EDITOR_THEME_LABEL_MAP,
	CODE_EDITOR_THEME_OPTIONS,
} from '../../constants/codeEditor';
import CodeMirrorEditor from './codeEditor/CodeMirrorEditor';
import { buildCodeMirrorExtensions } from './codeEditor/buildCodeMirrorExtensions';

export interface CodeEditorValue {
	label: string;
	language: string;
	editorTheme: 'vscode-dark' | 'vscode-light';
	note: string;
	code: string;
}

interface CodeEditorDialogProps {
	visible: boolean;
	value: CodeEditorValue;
	title?: string;
	extraCompletions?: Completion[];
	extraExtensions?: Extension[];
	completionMode?: 'append' | 'replace';
	onOpenWorkbench?: (payload: Pick<CodeEditorValue, 'label' | 'language'> & {
		code: string;
		editorTheme: CodeEditorValue['editorTheme'];
	}) => void;
	onClose: () => void;
	onApply: (nextValue: Pick<CodeEditorValue, 'code' | 'editorTheme'>) => void;
}

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;

const CodeEditorDialog: React.FC<CodeEditorDialogProps> = ({
	visible,
	value,
	title,
	extraCompletions,
	extraExtensions,
	completionMode,
	onOpenWorkbench,
	onClose,
	onApply,
}) => {
	const [draftCode, setDraftCode] = useState(value.code);
	const [draftTheme, setDraftTheme] = useState<CodeEditorValue['editorTheme']>(value.editorTheme);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [fontSize, setFontSize] = useState(14);
	const editorViewRef = useRef<EditorView | null>(null);

	useEffect(() => {
		if (visible) {
			setDraftCode(value.code);
			setDraftTheme(value.editorTheme);
			setIsFullscreen(false);
			setFontSize(14);
		}
	}, [value, visible]);


	const canApply = useMemo(
		() => draftCode !== value.code || draftTheme !== value.editorTheme,
		[draftCode, draftTheme, value.code, value.editorTheme],
	);

	const editorExtensions = useMemo<Extension[]>(
		() =>
			buildCodeMirrorExtensions({
				language: value.language,
				extraCompletions,
				extraExtensions,
				completionMode,
			}),
		[completionMode, extraCompletions, extraExtensions, value.language],
	);

	const handleUndo = () => {
		if (!editorViewRef.current) {
			return;
		}

		undo(editorViewRef.current);
	};

	const handleRedo = () => {
		if (!editorViewRef.current) {
			return;
		}

		redo(editorViewRef.current);
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(draftCode || '');
		} catch {
			// ignore
		}
	};

	const handleClear = () => {
		setDraftCode('');
	};

	const contentHeight = isFullscreen ? '72vh' : '520px';

	return (
		<Dialog
			visible={visible}
			header={title || '代码节点编辑'}
			draggable
			width={isFullscreen ? '96vw' : '880px'}
			top={isFullscreen ? '2vh' : '64px'}
			closeOnEscKeydown
			closeOnOverlayClick={false}
			destroyOnClose
			className={`code-editor-dialog${isFullscreen ? ' is-fullscreen' : ''}${draftTheme === 'vscode-light' ? ' code-editor-dialog--light' : ''}`}
			dialogClassName="code-editor-dialog__panel"
			onClose={onClose}
			onConfirm={() =>
				onApply({
					code: draftCode,
					editorTheme: draftTheme,
				})
			}
			confirmBtn={{
				content: '应用代码',
				disabled: !canApply,
			}}
			cancelBtn="取消"
		>
			<div className="code-editor-dialog__form" style={{ height: contentHeight }}>
				<div className="code-editor-dialog__meta">
					<span className="code-editor-dialog__meta-item">语言：{value.language || 'javascript'}</span>
					<span className="code-editor-dialog__meta-item">主题：{CODE_EDITOR_THEME_LABEL_MAP[draftTheme]}</span>
					<span className="code-editor-dialog__meta-item">长度：{draftCode.length} chars</span>
				</div>

				<div className="code-editor-dialog__editor-wrap">
					<div className="code-editor-dialog__toolbar">
						<Space size={8}>
							<Button size="small" variant="outline" onClick={handleUndo}>撤销</Button>
							<Button size="small" variant="outline" onClick={handleRedo}>重做</Button>
							<Button size="small" variant="outline" onClick={handleCopy}>复制</Button>
							<Button size="small" variant="outline" theme="danger" onClick={handleClear}>清空</Button>
						</Space>

						<Space size={8}>
							<Select
								size="small"
								style={{ width: 150 }}
								options={CODE_EDITOR_THEME_OPTIONS}
								value={draftTheme}
								onChange={(nextValue) =>
									setDraftTheme(String(nextValue ?? 'vscode-dark') === 'vscode-light' ? 'vscode-light' : 'vscode-dark')
								}
							/>
							<Button
								size="small"
								variant="outline"
								disabled={fontSize <= MIN_FONT_SIZE}
								onClick={() => setFontSize((previous) => Math.max(MIN_FONT_SIZE, previous - 1))}
							>
								A-
							</Button>
							<Button
								size="small"
								variant="outline"
								disabled={fontSize >= MAX_FONT_SIZE}
								onClick={() => setFontSize((previous) => Math.min(MAX_FONT_SIZE, previous + 1))}
							>
								A+
							</Button>
							<Button size="small" variant="outline" onClick={() => setIsFullscreen((previous) => !previous)}>
								{isFullscreen ? '退出全屏' : '全屏'}
							</Button>
							{onOpenWorkbench ? (
								<Button
									size="small"
									variant="outline"
									onClick={() =>
										onOpenWorkbench({
											label: value.label,
											language: value.language,
											code: draftCode,
											editorTheme: draftTheme,
										})
									}
								>
									在工作台中打开
								</Button>
							) : null}
						</Space>
					</div>

					<div className="code-editor-dialog__editor" style={{ fontSize }}>
						<CodeMirrorEditor
							value={draftCode}
							height="100%"
							editorTheme={draftTheme}
							extensions={editorExtensions}
							fontSize={fontSize}
							className="code-editor-shell"
							onCreateEditor={(view) => {
								editorViewRef.current = view;
							}}
							onChange={setDraftCode}
						/>
					</div>
				</div>

			</div>
		</Dialog>
	);
};

export default React.memo(CodeEditorDialog);

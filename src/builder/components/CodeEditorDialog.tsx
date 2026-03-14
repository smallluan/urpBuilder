import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Select, Space } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { undo, redo } from '@codemirror/commands';
import { autocompletion, completeFromList } from '@codemirror/autocomplete';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import {
	CODE_EDITOR_JS_GLOBAL_COMPLETIONS,
	CODE_EDITOR_THEME_LABEL_MAP,
	CODE_EDITOR_THEME_OPTIONS,
} from '../../constants/codeEditor';

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
	onClose: () => void;
	onApply: (nextValue: Pick<CodeEditorValue, 'code' | 'editorTheme'>) => void;
}

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;

const CodeEditorDialog: React.FC<CodeEditorDialogProps> = ({ visible, value, onClose, onApply }) => {
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

	const editorExtensions = useMemo<Extension[]>(() => {
		const lang = String(value.language || 'javascript').toLowerCase();

		const jsCompletion = javascriptLanguage.data.of({
			autocomplete: completeFromList(CODE_EDITOR_JS_GLOBAL_COMPLETIONS),
		});

		if (lang === 'typescript') {
			return [javascript({ typescript: true }), jsCompletion, autocompletion({ activateOnTyping: true })];
		}

		if (lang === 'json') {
			return [json(), autocompletion({ activateOnTyping: true })];
		}

		if (lang === 'css') {
			return [css(), autocompletion({ activateOnTyping: true })];
		}

		return [javascript(), jsCompletion, autocompletion({ activateOnTyping: true })];
	}, [value.language]);

	const editorTheme = useMemo(() => {
		return draftTheme === 'vscode-light' ? vscodeLight : vscodeDark;
	}, [draftTheme]);

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
			header="代码节点编辑"
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
						</Space>
					</div>

					<div className="code-editor-dialog__editor" style={{ fontSize }}>
						<CodeMirror
							value={draftCode}
							height="100%"
							theme={editorTheme}
							extensions={editorExtensions}
							basicSetup={{
								lineNumbers: true,
								foldGutter: true,
								highlightActiveLine: true,
								autocompletion: true,
							}}
							onCreateEditor={(view) => {
								editorViewRef.current = view;
							}}
							onChange={(nextValue) => setDraftCode(nextValue)}
						/>
					</div>
				</div>

			</div>
		</Dialog>
	);
};

export default React.memo(CodeEditorDialog);

import React, { useEffect, useMemo, useState } from 'react';
import { Button, ColorPicker, Drawer, Input, Select, Space, Switch, Typography } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';

interface NodeStyleDrawerProps {
	value?: Record<string, unknown>;
	onChange: (nextStyle: Record<string, unknown>) => void;
	targetKey?: string;
	triggerRenderer?: (openDrawer: () => void) => React.ReactNode;
}

type StyleValue = Record<string, string>;

const QUICK_INSERT_PROPERTIES = [
	{ label: '插入宽度', line: 'width: 100%;' },
	{ label: '插入高度', line: 'height: 240px;' },
	{ label: '插入背景色', line: 'background-color: #ffffff;' },
	{ label: '插入文字色', line: 'color: #333333;' },
	{ label: '插入内边距', line: 'padding: 8px 12px;' },
	{ label: '插入圆角', line: 'border-radius: 6px;' },
	{ label: '插入边框', line: 'border: 1px solid #d9d9d9;' },
	{ label: '插入过渡', line: 'transition: all .2s ease;' },
];

const COLOR_PROPERTIES = [
	{ label: '背景色', value: 'background-color' },
	{ label: '文字颜色', value: 'color' },
	{ label: '边框颜色', value: 'border-color' },
];

const QUICK_SNIPPETS = [
	{
		label: '卡片基础样式',
		lines: [
			'background-color: #ffffff;',
			'border: 1px solid #e7e7e7;',
			'border-radius: 8px;',
			'padding: 12px;',
			'transition: all .2s ease;',
		],
	},
	{
		label: 'Flex 居中',
		lines: [
			'display: flex;',
			'justify-content: center;',
			'align-items: center;',
		],
	},
	{
		label: '标题文本',
		lines: [
			'font-size: 18px;',
			'font-weight: 600;',
			'line-height: 1.4;',
			'color: #1f2329;',
		],
	},
];

interface VisualField {
	key: string;
	label: string;
	type: 'input' | 'color' | 'select';
	options?: Array<{ label: string; value: string }>;
}

const VISUAL_FIELDS: VisualField[] = [
	{ key: 'width', label: '宽度', type: 'input' },
	{ key: 'height', label: '高度', type: 'input' },
	{ key: 'min-width', label: '最小宽度', type: 'input' },
	{ key: 'min-height', label: '最小高度', type: 'input' },
	{ key: 'max-width', label: '最大宽度', type: 'input' },
	{ key: 'max-height', label: '最大高度', type: 'input' },
	{ key: 'background-color', label: '背景色', type: 'color' },
	{ key: 'color', label: '文字色', type: 'color' },
	{ key: 'border-color', label: '边框色', type: 'color' },
	{ key: 'font-size', label: '字号', type: 'input' },
	{ key: 'padding', label: '内边距', type: 'input' },
	{ key: 'margin', label: '外边距', type: 'input' },
	{ key: 'border-radius', label: '圆角', type: 'input' },
	{ key: 'transition', label: '过渡', type: 'input' },
	{
		key: 'display',
		label: '显示',
		type: 'select',
		options: [
			{ label: 'block', value: 'block' },
			{ label: 'inline-block', value: 'inline-block' },
			{ label: 'flex', value: 'flex' },
			{ label: 'grid', value: 'grid' },
			{ label: 'none', value: 'none' },
		],
	},
	{
		key: 'text-align',
		label: '文本对齐',
		type: 'select',
		options: [
			{ label: 'left', value: 'left' },
			{ label: 'center', value: 'center' },
			{ label: 'right', value: 'right' },
			{ label: 'justify', value: 'justify' },
		],
	},
];

const normalizeStyleValue = (value?: Record<string, unknown>) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {} as StyleValue;
	}

	const styleMap: StyleValue = {};
	Object.entries(value).forEach(([key, val]) => {
		if (val === null || val === undefined) {
			return;
		}

		styleMap[key] = String(val);
	});

	return styleMap;
};

const kebabToCamel = (value: string) => value.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());

const camelToKebab = (value: string) => value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);

const styleToCssText = (style: StyleValue) => {
	const lines = Object.entries(style)
		.filter(([, cssValue]) => String(cssValue ?? '').trim().length > 0)
		.map(([property, cssValue]) => `${camelToKebab(property)}: ${String(cssValue).trim()};`);

	return lines.join('\n');
};

const parseCssText = (cssText: string) => {
	const cleanedText = cssText
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/[{}]/g, '\n');

	const nextStyle: Record<string, unknown> = {};
	const invalidLines: string[] = [];

	const lines = cleanedText
		.split(/\n+/)
		.flatMap((row) => row.split(';'))
		.map((row) => row.trim())
		.filter(Boolean);

	lines.forEach((line) => {
		const splitIndex = line.indexOf(':');
		if (splitIndex <= 0) {
			invalidLines.push(line);
			return;
		}

		const rawProperty = line.slice(0, splitIndex).trim();
		const rawValue = line.slice(splitIndex + 1).trim();

		if (!rawProperty || !rawValue) {
			invalidLines.push(line);
			return;
		}

		const property = kebabToCamel(rawProperty);
		nextStyle[property] = rawValue;
	});

	return {
		style: nextStyle,
		invalidLines,
		validCount: Object.keys(nextStyle).length,
	};
};

const cssTextToPayload = (cssText: string): Record<string, unknown> => {
	const parsed = parseCssText(cssText);
	return parsed.style;
};

const upsertCssPropertyLine = (cssText: string, property: string, value: string) => {
	const propertyRegex = new RegExp(`(^|\\n)\\s*${property}\\s*:[^;]*;?`, 'i');
	const normalizedLine = `${property}: ${value};`;

	if (propertyRegex.test(cssText)) {
		return cssText.replace(propertyRegex, (matched) => {
			const prefix = matched.startsWith('\n') ? '\n' : '';
			return `${prefix}${normalizedLine}`;
		});
	}

	const trimmed = cssText.trim();
	if (!trimmed) {
		return normalizedLine;
	}

	return `${trimmed}\n${normalizedLine}`;
};

const toPayload = (draft: StyleValue): Record<string, unknown> => {
	const nextStyle: Record<string, unknown> = {};
	Object.entries(draft).forEach(([key, value]) => {
		const text = String(value ?? '').trim();
		if (!text) {
			return;
		}
		nextStyle[key] = text;
	});
	return nextStyle;
};

const normalizeComparableStyle = (value?: Record<string, unknown>) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {} as Record<string, string>;
	}

	const normalizedEntries = Object.entries(value)
		.map(([key, rawValue]) => [key, String(rawValue ?? '').trim()] as const)
		.filter(([, text]) => text.length > 0)
		.sort(([a], [b]) => a.localeCompare(b));

	return Object.fromEntries(normalizedEntries);
};

const isSameStylePayload = (left: Record<string, unknown>, right: Record<string, unknown>) => {
	const normalizedLeft = normalizeComparableStyle(left);
	const normalizedRight = normalizeComparableStyle(right);
	const leftKeys = Object.keys(normalizedLeft);
	const rightKeys = Object.keys(normalizedRight);

	if (leftKeys.length !== rightKeys.length) {
		return false;
	}

	return leftKeys.every((key) => normalizedLeft[key] === normalizedRight[key]);
};

const NodeStyleDrawer: React.FC<NodeStyleDrawerProps> = ({
	value,
	onChange,
	targetKey,
	triggerRenderer,
}) => {
	const [visible, setVisible] = useState(false);
	const [cssDraft, setCssDraft] = useState('');
	const [autoApply, setAutoApply] = useState(true);
	const [hasUserEdited, setHasUserEdited] = useState(false);
	const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
	const [selectedColorProperty, setSelectedColorProperty] = useState('background-color');
	const [selectedColor, setSelectedColor] = useState('#0052d9');
	const [selectedSnippet, setSelectedSnippet] = useState('');

	const normalized = useMemo(() => normalizeStyleValue(value), [value]);
	const parseResult = useMemo(() => parseCssText(cssDraft), [cssDraft]);
	const visualDraft = useMemo(() => normalizeStyleValue(parseResult.style), [parseResult.style]);

	const resetFromCurrentValue = () => {
		const nextText = styleToCssText(normalized);
		setCssDraft(nextText);
		setHasUserEdited(false);
		setSelectedColorProperty('background-color');
		setSelectedColor('#0052d9');
		setSelectedSnippet('');
		setActiveTab('visual');
	};

	useEffect(() => {
		if (!visible) {
			resetFromCurrentValue();
		}
	}, [normalized, visible, targetKey]);

	useEffect(() => {
		if (!visible) {
			return;
		}

		resetFromCurrentValue();
	}, [targetKey]);

	useEffect(() => {
		if (!visible || !autoApply || !hasUserEdited) {
			return;
		}

		const nextPayload = cssTextToPayload(cssDraft);
		if (isSameStylePayload(nextPayload, normalized)) {
			return;
		}

		onChange(nextPayload);
	}, [visible, autoApply, hasUserEdited, cssDraft, normalized, onChange]);

	const handleClose = () => {
		setVisible(false);
	};

	const handleOpen = () => {
		setVisible(true);
	};

	const handleApply = () => {
		onChange(cssTextToPayload(cssDraft));
		setHasUserEdited(false);
		setVisible(false);
	};

	const handleReset = () => {
		setCssDraft(styleToCssText(normalized));
		setHasUserEdited(true);
	};

	const handleClear = () => {
		setCssDraft('');
		setHasUserEdited(true);
	};

	const handleVisualFieldChange = (field: VisualField, nextValue: string) => {
		const draft = { ...visualDraft };
		if (!nextValue.trim()) {
			delete draft[field.key];
		} else {
			draft[field.key] = nextValue;
		}
		setCssDraft(styleToCssText(draft));
		setHasUserEdited(true);
	};

	const insertPropertyLine = (line: string) => {
		setCssDraft((previous) => {
			const next = previous.trim() ? `${previous.trim()}\n${line}` : line;
			return next;
		});
		setHasUserEdited(true);
	};

	const applyColorProperty = () => {
		setCssDraft((previous) => upsertCssPropertyLine(previous, selectedColorProperty, selectedColor));
		setHasUserEdited(true);
	};

	const applySnippet = (snippetValue: string) => {
		const snippet = QUICK_SNIPPETS.find((item) => item.label === snippetValue);
		if (!snippet) {
			return;
		}

		setCssDraft((previous) => {
			const base = previous.trim();
			const block = snippet.lines.join('\n');
			return base ? `${base}\n${block}` : block;
		});
		setHasUserEdited(true);
	};

	const hasInvalidCssLines = parseResult.invalidLines.length > 0;

	return (
		<>
			{triggerRenderer ? triggerRenderer(handleOpen) : (
				<Button size="small" variant="outline" onClick={handleOpen}>样式</Button>
			)}

			<Drawer
				visible={visible}
				header="样式编辑器"
				placement="right"
				size="720px"
				closeBtn
				destroyOnClose
				onClose={handleClose}
			>
				<div className="node-style-drawer">
					<div className="node-style-drawer__header">
						<Space size={8} align="center">
							<Typography.Text>实时应用</Typography.Text>
							<Switch value={autoApply} onChange={(next) => setAutoApply(Boolean(next))} />
						</Space>

						<Space size={8}>
							<Button size="small" variant={activeTab === 'visual' ? 'base' : 'outline'} onClick={() => setActiveTab('visual')}>可视化</Button>
							<Button size="small" variant={activeTab === 'code' ? 'base' : 'outline'} onClick={() => setActiveTab('code')}>代码</Button>
						</Space>
					</div>

					{activeTab === 'visual' ? (
						<div className="node-style-drawer__visual">
							<div className="node-style-drawer__visual-grid">
								{VISUAL_FIELDS.map((field) => {
									const fieldValue = String(visualDraft[field.key] ?? '');

									if (field.type === 'color') {
										return (
											<div className="node-style-drawer__field" key={field.key}>
												<Typography.Text>{field.label}</Typography.Text>
												<ColorPicker
													value={fieldValue || '#ffffff'}
													onChange={(value) => handleVisualFieldChange(field, String(value ?? ''))}
												/>
											</div>
										);
									}

									if (field.type === 'select') {
										return (
											<div className="node-style-drawer__field" key={field.key}>
												<Typography.Text>{field.label}</Typography.Text>
												<Select
													clearable
													options={field.options ?? []}
													value={fieldValue || undefined}
													onChange={(value) => handleVisualFieldChange(field, String(value ?? ''))}
												/>
											</div>
										);
									}

									return (
										<div className="node-style-drawer__field" key={field.key}>
											<Typography.Text>{field.label}</Typography.Text>
											<Input
												value={fieldValue}
												placeholder="请输入 CSS 值"
												onChange={(value) => handleVisualFieldChange(field, String(value ?? ''))}
											/>
										</div>
									);
								})}
							</div>

							<div className="node-style-drawer__quick-actions">
								<Typography.Text>快速插入</Typography.Text>
								<Space>
									{QUICK_INSERT_PROPERTIES.map((item) => (
										<Button key={item.label} size="small" variant="outline" onClick={() => insertPropertyLine(item.line)}>
											{item.label}
										</Button>
									))}
								</Space>
							</div>

							<div className="node-style-drawer__quick-actions">
								<Typography.Text>颜色快捷设置</Typography.Text>
								<Space>
									<Select
										style={{ width: 180 }}
										options={COLOR_PROPERTIES}
										keys={{ value: 'value', label: 'label' }}
										value={selectedColorProperty}
										onChange={(value) => setSelectedColorProperty(String(value ?? 'background-color'))}
									/>
									<ColorPicker value={selectedColor} onChange={(value) => setSelectedColor(String(value ?? '#0052d9'))} />
									<Button size="small" onClick={applyColorProperty}>应用颜色</Button>
								</Space>
							</div>

							<div className="node-style-drawer__quick-actions">
								<Typography.Text>样式片段</Typography.Text>
								<Space>
									<Select
										clearable
										style={{ width: 220 }}
										options={QUICK_SNIPPETS.map((item) => ({ label: item.label, value: item.label }))}
										value={selectedSnippet || undefined}
										onChange={(value) => {
											const next = String(value ?? '');
											setSelectedSnippet(next);
											if (next) {
												applySnippet(next);
											}
										}}
									/>
								</Space>
							</div>
						</div>
					) : (
						<div className="node-style-drawer__code">
							<CodeMirror
								value={cssDraft}
								height="420px"
								extensions={[css()]}
								basicSetup={{
									lineNumbers: true,
									foldGutter: true,
									highlightActiveLine: true,
								}}
								onChange={(value) => {
									setCssDraft(value);
									setHasUserEdited(true);
								}}
							/>

							<div className="node-style-drawer__code-meta">
								<Typography.Text>
									已解析 {parseResult.validCount} 条属性
								</Typography.Text>
								{hasInvalidCssLines ? (
									<Typography.Text theme="warning">
										存在 {parseResult.invalidLines.length} 行无法解析
									</Typography.Text>
								) : null}
							</div>
						</div>
					)}

					<div className="node-style-drawer__footer">
						<Space>
							<Button variant="outline" onClick={handleReset}>重置</Button>
							<Button variant="outline" theme="danger" onClick={handleClear}>清空</Button>
							<Button onClick={handleApply}>应用</Button>
						</Space>
					</div>

					{hasInvalidCssLines ? (
						<div className="node-style-drawer__invalid">
							<Typography.Text theme="warning">以下内容未被解析：</Typography.Text>
							<Typography.Paragraph>
								{parseResult.invalidLines.join(' / ')}
							</Typography.Paragraph>
						</div>
					) : null}

					<div className="node-style-drawer__preview">
						<Typography.Text>预览 payload</Typography.Text>
						<pre>{JSON.stringify(toPayload(visualDraft), null, 2)}</pre>
					</div>
				</div>
			</Drawer>
		</>
	);
};

export default React.memo(NodeStyleDrawer);

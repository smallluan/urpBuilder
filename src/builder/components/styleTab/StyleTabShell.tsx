import React, { useCallback, useMemo, useState } from 'react';
import { Button, Drawer } from 'tdesign-react';
import BoxModelStyleEditor from './BoxModelStyleEditor';
import BoxShadowStyleEditor from './BoxShadowStyleEditor';
import BackgroundStyleEditor from './BackgroundStyleEditor';
import TypographyStyleEditor from './TypographyStyleEditor';
import DisplayStyleEditor from './DisplayStyleEditor';
import OpacityStyleEditor from './OpacityStyleEditor';
import PositionStyleEditor from './PositionStyleEditor';
import './StyleTabShell.less';

export type StyleDrawerPanel =
  | 'box'
  | 'shadow'
  | 'background'
  | 'typography'
  | 'display'
  | 'opacity'
  | 'position'
  | null;

export interface StyleTabShellProps {
  value?: Record<string, unknown>;
  onPatchStyle: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  targetKey?: string;
  computedHints: Record<string, string>;
}

const EntryRow: React.FC<{
  title: string;
  description?: string;
  onOpen: () => void;
  disabled?: boolean;
}> = ({ title, description, onOpen, disabled }) => (
  <div className="style-tab-shell__entry">
    <div className="style-tab-shell__entry-text">
      <span className="style-tab-shell__entry-title">{title}</span>
      {description ? <span className="style-tab-shell__entry-desc">{description}</span> : null}
    </div>
    <Button size="small" variant="outline" theme="default" disabled={disabled} onClick={onOpen}>
      配置
    </Button>
  </div>
);

const DRAWER_HEADERS: Record<Exclude<StyleDrawerPanel, null>, string> = {
  box: '盒模型与尺寸',
  display: '布局模式',
  background: '背景',
  typography: '文字排版',
  opacity: '透明度',
  shadow: '阴影',
  position: '定位与层级',
};

const StyleTabShell: React.FC<StyleTabShellProps> = ({
  value,
  onPatchStyle,
  readOnly,
  targetKey,
  computedHints,
}) => {
  const [panel, setPanel] = useState<StyleDrawerPanel>(null);

  const handlePatch = useCallback(
    (patch: Record<string, string | undefined>) => {
      if (readOnly) return;
      onPatchStyle(patch);
    },
    [onPatchStyle, readOnly],
  );

  const drawerHeader = useMemo(() => {
    if (!panel) return '';
    return DRAWER_HEADERS[panel] ?? '';
  }, [panel]);

  const editorKey = targetKey ?? '__style__';

  return (
    <div className="node-style-tab style-tab-shell config-form config-panel-style-tab">
      {/* ── 基础布局 ── */}
      <section className="style-tab-shell__group" aria-labelledby="style-group-layout">
        <h4 id="style-group-layout" className="style-tab-shell__group-title">基础布局</h4>
        <EntryRow
          title="盒模型与尺寸"
          description="外边距、边框、内边距、宽高、圆角"
          onOpen={() => setPanel('box')}
          disabled={!!readOnly}
        />
        <EntryRow
          title="布局模式"
          description="display、flex 布局、间距、溢出"
          onOpen={() => setPanel('display')}
          disabled={!!readOnly}
        />
      </section>

      {/* ── 外观 ── */}
      <section className="style-tab-shell__group" aria-labelledby="style-group-look">
        <h4 id="style-group-look" className="style-tab-shell__group-title">外观</h4>
        <EntryRow
          title="背景"
          description="背景色与语义 token"
          onOpen={() => setPanel('background')}
          disabled={!!readOnly}
        />
        <EntryRow
          title="文字排版"
          description="字号、字重、行高、颜色、对齐"
          onOpen={() => setPanel('typography')}
          disabled={!!readOnly}
        />
        <EntryRow
          title="透明度"
          description="opacity"
          onOpen={() => setPanel('opacity')}
          disabled={!!readOnly}
        />
      </section>

      {/* ── 效果 ── */}
      <section className="style-tab-shell__group" aria-labelledby="style-group-effect">
        <h4 id="style-group-effect" className="style-tab-shell__group-title">效果</h4>
        <EntryRow
          title="阴影"
          description="box-shadow 单层编辑"
          onOpen={() => setPanel('shadow')}
          disabled={!!readOnly}
        />
      </section>

      {/* ── 定位 ── */}
      <section className="style-tab-shell__group" aria-labelledby="style-group-position">
        <h4 id="style-group-position" className="style-tab-shell__group-title">定位</h4>
        <EntryRow
          title="定位与层级"
          description="position、偏移、z-index"
          onOpen={() => setPanel('position')}
          disabled={!!readOnly}
        />
      </section>

      {/* ── Global Drawer ── */}
      <Drawer
        className="style-tab-shell__drawer"
        visible={panel !== null}
        header={drawerHeader}
        placement="right"
        size="min(720px, 92vw)"
        zIndex={5600}
        footer={false}
        showOverlay
        closeOnOverlayClick
        preventScrollThrough
        lazy={false}
        destroyOnClose={false}
        onClose={() => setPanel(null)}
      >
        <div className="style-tab-drawer-body">
          {panel === 'box' && (
            <BoxModelStyleEditor
              key={editorKey}
              value={value}
              onPatch={handlePatch}
              readOnly={readOnly}
              computedHints={computedHints}
            />
          )}
          {panel === 'display' && (
            <DisplayStyleEditor
              key={`${editorKey}__display`}
              value={value}
              onPatch={handlePatch}
              readOnly={readOnly}
              computedHints={computedHints}
            />
          )}
          {panel === 'background' && (
            <BackgroundStyleEditor
              key={`${editorKey}__bg`}
              value={value}
              onPatch={handlePatch}
              readOnly={readOnly}
              computedHints={computedHints}
            />
          )}
          {panel === 'typography' && (
            <TypographyStyleEditor
              key={`${editorKey}__typo`}
              value={value}
              onPatch={handlePatch}
              readOnly={readOnly}
              computedHints={computedHints}
            />
          )}
          {panel === 'opacity' && (
            <OpacityStyleEditor
              key={`${editorKey}__opacity`}
              value={value}
              onPatch={handlePatch}
              readOnly={readOnly}
              computedHints={computedHints}
            />
          )}
          {panel === 'shadow' && (
            <BoxShadowStyleEditor
              key={`${editorKey}__shadow`}
              value={value}
              onPatch={handlePatch}
              readOnly={readOnly}
              computedHints={computedHints}
            />
          )}
          {panel === 'position' && (
            <PositionStyleEditor
              key={`${editorKey}__position`}
              value={value}
              onPatch={handlePatch}
              readOnly={readOnly}
              computedHints={computedHints}
            />
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default React.memo(StyleTabShell);

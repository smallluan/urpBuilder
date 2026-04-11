import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Empty, Input, MessagePlugin, Pagination, Select, Space, Typography } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import {
  getIconOptionsByFilters,
  ICON_INITIAL_FILTER_OPTIONS,
  ICON_QUICK_FILTER_OPTIONS,
  renderNamedIcon,
  resolveIconName,
  type IconInitialFilterKey,
  type IconQuickFilterKey,
} from '../../constants/iconRegistry';
import './IconPickerModal.less';

const PAGE_SIZE = 72;

/** Dialog 为 6000，下拉必须更高，否则选项面板被遮罩挡住、表现为「无选项」 */
const SELECT_POPUP_Z_INDEX = 6500;

export interface IconPickerModalProps {
  visible: boolean;
  /** 当前编辑的属性键；切换属性时用于重置弹窗内搜索与分页 */
  propKey: string;
  value: string;
  quickFilter: IconQuickFilterKey;
  initialFilter: IconInitialFilterKey;
  onQuickFilterChange: (next: IconQuickFilterKey) => void;
  onInitialFilterChange: (next: IconInitialFilterKey) => void;
  onSelect: (iconName: string) => void;
  /** 清空已选图标（配置面板不再提供「清除」时由此触发） */
  onClear: () => void;
  readOnly?: boolean;
  onClose: () => void;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({
  visible,
  propKey,
  value,
  quickFilter,
  initialFilter,
  onQuickFilterChange,
  onInitialFilterChange,
  onSelect,
  onClear,
  readOnly = false,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [locateFlashName, setLocateFlashName] = useState<string | null>(null);
  /** 点击「当前」链接触发定位时递增，保证在筛选已是「全部」时也会跑定位逻辑 */
  const [locateNonce, setLocateNonce] = useState(0);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const pendingLocateRef = useRef<string | null>(null);
  /** 定位当前图标时会重置筛选，避免「筛选变化时页码归 1」覆盖目标页 */
  const skipNextFilterPageResetRef = useRef(false);

  const selectPopupProps = useMemo(
    () => ({
      zIndex: SELECT_POPUP_Z_INDEX,
      attach: () => document.body,
    }),
    [],
  );

  React.useEffect(() => {
    if (visible) {
      setSearch('');
      setPage(1);
      pendingLocateRef.current = null;
      setLocateFlashName(null);
    }
  }, [visible, propKey]);

  const filtered = useMemo(() => {
    const list = getIconOptionsByFilters(quickFilter, initialFilter);
    const q = search.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter((opt) => opt.value.includes(q));
  }, [quickFilter, initialFilter, search]);

  React.useEffect(() => {
    if (skipNextFilterPageResetRef.current) {
      skipNextFilterPageResetRef.current = false;
      return;
    }
    setPage(1);
  }, [quickFilter, initialFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  React.useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const resolvedCurrentIcon = useMemo(() => resolveIconName(value.trim()), [value]);

  useLayoutEffect(() => {
    const targetName = pendingLocateRef.current;
    if (!targetName || !visible) {
      return;
    }
    if (quickFilter !== 'all' || initialFilter !== 'all' || search.trim() !== '') {
      return;
    }
    const list = getIconOptionsByFilters('all', 'all');
    const idx = list.findIndex((o) => o.value === targetName);
    if (idx < 0) {
      MessagePlugin.warning('未在图标库中找到该名称');
      pendingLocateRef.current = null;
      return;
    }
    const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
    if (page !== targetPage) {
      setPage(targetPage);
      return;
    }
    requestAnimationFrame(() => {
      const root = gridWrapRef.current;
      const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(targetName) : targetName.replace(/"/g, '\\"');
      const el = root?.querySelector(`[data-icon-cell="${escaped}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setLocateFlashName(targetName);
      pendingLocateRef.current = null;
      window.setTimeout(() => setLocateFlashName(null), 2200);
    });
  }, [visible, quickFilter, initialFilter, search, page, propKey, locateNonce]);

  const handlePick = (name: string) => {
    onSelect(name);
    onClose();
  };

  const handleLocateCurrent = () => {
    const raw = value.trim();
    if (!raw) {
      return;
    }
    const resolved = resolveIconName(raw);
    if (!resolved) {
      MessagePlugin.warning('当前名称无法解析为有效图标');
      return;
    }
    const willChangeFilters = quickFilter !== 'all' || initialFilter !== 'all' || search.trim() !== '';
    if (willChangeFilters) {
      skipNextFilterPageResetRef.current = true;
    }
    pendingLocateRef.current = resolved;
    onQuickFilterChange('all');
    onInitialFilterChange('all');
    setSearch('');
    setLocateNonce((n) => n + 1);
  };

  const handleClearSelection = () => {
    if (readOnly) {
      return;
    }
    onClear();
  };

  return (
    <Dialog
      className="icon-picker-dialog"
      visible={visible}
      width="920px"
      header="选择图标"
      placement="center"
      closeOnOverlayClick
      destroyOnClose
      footer={false}
      zIndex={6000}
      onClose={onClose}
    >
      <div className="icon-picker-dialog__toolbar">
        <div className="icon-picker-dialog__search-wrap">
          <Input
            className="icon-picker-dialog__search"
            size="small"
            value={search}
            placeholder="搜索名称（如 search、arrow-left）"
            prefixIcon={<SearchIcon />}
            clearable
            onChange={(v) => setSearch(String(v ?? ''))}
          />
        </div>
        <div className="icon-picker-dialog__filter-wrap">
          <Select
            size="small"
            className="icon-picker-dialog__filter"
            options={ICON_QUICK_FILTER_OPTIONS}
            value={quickFilter}
            placeholder="分类"
            popupProps={selectPopupProps}
            onChange={(v) => onQuickFilterChange(String(v ?? 'all') as IconQuickFilterKey)}
          />
        </div>
        <div className="icon-picker-dialog__filter-wrap">
          <Select
            size="small"
            className="icon-picker-dialog__filter"
            options={ICON_INITIAL_FILTER_OPTIONS}
            value={initialFilter}
            placeholder="首字母"
            popupProps={selectPopupProps}
            onChange={(v) => onInitialFilterChange(String(v ?? 'all') as IconInitialFilterKey)}
          />
        </div>
        <Button
          className="icon-picker-dialog__clear-btn"
          size="small"
          variant="outline"
          disabled={readOnly || !value.trim()}
          onClick={handleClearSelection}
        >
          清除
        </Button>
      </div>

      <div className="icon-picker-dialog__meta">
        <Space size={8}>
          <Typography.Text theme="secondary" style={{ fontSize: 12 }}>
            共 {filtered.length} 个
          </Typography.Text>
          {value.trim() ? (
            <Typography.Text style={{ fontSize: 12 }}>
              当前：
              <button
                type="button"
                className="icon-picker-dialog__current-name-btn"
                onClick={handleLocateCurrent}
              >
                {value.trim()}
              </button>
            </Typography.Text>
          ) : null}
        </Space>
      </div>

      <div className="icon-picker-dialog__grid-wrap" ref={gridWrapRef}>
        {pageItems.length === 0 ? (
          <Empty description="没有符合当前条件的图标，请调整筛选或搜索" size="small" />
        ) : (
          <div className="icon-picker-dialog__grid">
            {pageItems.map((opt) => {
              const selected = resolvedCurrentIcon === opt.value;
              const flash = locateFlashName === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-icon-cell={opt.value}
                  className={`icon-picker-cell${selected ? ' icon-picker-cell--selected' : ''}${flash ? ' icon-picker-cell--locate-flash' : ''}`}
                  title={opt.value}
                  onClick={() => handlePick(opt.value)}
                >
                  <span className="icon-picker-cell__glyph">{renderNamedIcon(opt.value, { size: 22 })}</span>
                  <span className="icon-picker-cell__label">{opt.value}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="icon-picker-dialog__pagination">
          <Pagination
            size="small"
            total={filtered.length}
            current={currentPage}
            pageSize={PAGE_SIZE}
            showJumper
            onCurrentChange={setPage}
          />
        </div>
      ) : null}
    </Dialog>
  );
};

export default IconPickerModal;

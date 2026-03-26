import React, { useEffect, useMemo, useState } from 'react';
import { Input, Select } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { Boxes } from 'lucide-react';
import DragableWrapper from '../../components/DragableWrapper';
import { getComponentBaseList, getComponentTemplateDetail } from '../../api/componentTemplate';
import { useTeam } from '../../team/context';
import { resolveComponentSlots, resolveExposedLifecycles, resolveExposedPropSchemas } from '../../utils/customComponentRuntime';

interface CustomComponentSchema {
  name: string;
  type: 'CustomComponent';
  props: Record<string, unknown>;
  lifetimes: string[];
}

interface SavedComponentPanelProps {
  selectedName: string | null;
  onSelect: (name: string) => void;
  active?: boolean;
}

const SavedComponentPanel: React.FC<SavedComponentPanelProps> = ({ selectedName, onSelect, active = true }) => {
  const { currentTeamId } = useTeam();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [customComponentSchemas, setCustomComponentSchemas] = useState<CustomComponentSchema[]>([]);

  const handleOnDrapStart = (e: React.DragEvent<HTMLDivElement>, data: any) => {
    e.dataTransfer?.setData('drag-component-data', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let cancelled = false;

    const buildCustomComponentSchemas = async () => {
      try {
        const queryTasks: Array<ReturnType<typeof getComponentBaseList>> = [
          getComponentBaseList({ page: 1, pageSize: 100, mine: true, status: 'published' }),
        ];

        if (currentTeamId) {
          queryTasks.push(
            getComponentBaseList({
              page: 1,
              pageSize: 100,
              status: 'published',
              ownerType: 'team',
              ownerTeamId: currentTeamId,
            }),
          );
        }

        const baseResults = await Promise.all(queryTasks);
        const listMap = new Map<string, any>();
        baseResults.forEach((result) => {
          const items = Array.isArray(result.data?.list) ? result.data.list : [];
          items.forEach((item) => {
            const key = String(item.pageId || '').trim();
            if (!key) {
              return;
            }
            listMap.set(key, item);
          });
        });
        const list = Array.from(listMap.values());

        const details = await Promise.all(
          list.map(async (item) => {
            try {
              const detail = await getComponentTemplateDetail(String(item.pageId));
              return {
                base: item,
                detail: detail.data,
              };
            } catch {
              return {
                base: item,
                detail: null,
              };
            }
          }),
        );

        const nextSchemas = details
          .map(({ base, detail }) => {
            const exposedPropSchemas = resolveExposedPropSchemas(detail);
            const exposedLifecycles = resolveExposedLifecycles(detail);
            const componentSlots = resolveComponentSlots(detail);

            const props = {
              __componentId: {
                name: '组件ID',
                value: String(base.pageId ?? ''),
                editType: 'input',
              },
              __componentName: {
                name: '组件名称',
                value: String(base.pageName ?? base.pageId ?? '自定义组件'),
                editType: 'input',
              },
              __componentVersion: {
                name: '组件版本',
                value: Number.isFinite(Number((base as any).currentVersion)) ? Number((base as any).currentVersion) : 0,
                editType: 'inputNumber',
              },
              __componentUpdatedAt: {
                name: '组件更新时间',
                value: String((base as any).updatedAt ?? ''),
                editType: 'input',
              },
              __slots: {
                name: '插槽定义',
                value: componentSlots,
                editType: 'jsonCode',
              },
              ...Object.fromEntries(
                exposedPropSchemas.map((item) => [
                  item.propKey,
                  {
                    ...item.schema,
                    name: String(item.schema.name ?? item.propKey),
                    value: item.schema.value ?? '',
                  },
                ]),
              ),
            };

            return {
              name: String(base.pageName ?? base.pageId ?? '自定义组件'),
              type: 'CustomComponent' as const,
              props,
              lifetimes: Array.from(new Set(exposedLifecycles)),
            };
          })
          .filter((item) => !!item.name);

        if (!cancelled) {
          setCustomComponentSchemas(nextSchemas);
        }
      } catch {
        if (!cancelled) {
          setCustomComponentSchemas([]);
        }
      }
    };

    void buildCustomComponentSchemas();

    return () => {
      cancelled = true;
    };
  }, [active, currentTeamId]);

  const filteredCustomComponentSchemas = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) {
      return customComponentSchemas;
    }

    return customComponentSchemas.filter((item) => {
      return item.name.toLowerCase().includes(text)
        || String((item.props.__componentId as { value?: unknown } | undefined)?.value ?? '').toLowerCase().includes(text);
    });
  }, [customComponentSchemas, keyword]);

  return (
    <div className="right-panel-body">
      <div className="library-search-row saved-components-search-row">
        <Input
          clearable
          value={keyword}
          placeholder="搜索已保存组件"
          suffixIcon={<SearchIcon />}
          onChange={(value) => setKeyword(String(value ?? ''))}
        />
        <Select
          className="saved-components-category"
          value={category}
          options={[{ label: '全部分类（预留）', value: 'all' }]}
          onChange={(value) => setCategory(String(value ?? 'all'))}
        />
      </div>

      <div className="library-list">
        <div className="library-section">
          <div className="library-section-head">
            <div className="library-section-title">
              <Boxes size={14} />
              <span>自定义组件</span>
            </div>
            <span className="library-section-count">{filteredCustomComponentSchemas.length}</span>
          </div>

          {filteredCustomComponentSchemas.length > 0 ? (
            <div className="library-section-grid">
              {filteredCustomComponentSchemas.map((schema) => (
                <DragableWrapper onDragStart={handleOnDrapStart} key={`saved-${schema.name}-${(schema.props.__componentId as { value?: unknown } | undefined)?.value ?? ''}`} data={schema}>
                  <div
                    className={`library-item ${selectedName === schema.name ? 'is-active' : ''}`}
                    title={schema.name}
                    onClick={() => onSelect(schema.name)}
                  >
                    <div className="library-item-icon library-item-icon--action">
                      <Boxes size={16} />
                    </div>
                    <div className="library-item-name">{schema.name}</div>
                    <div className="library-item-type">{String((schema.props.__componentId as { value?: unknown } | undefined)?.value ?? 'CustomComponent')}</div>
                  </div>
                </DragableWrapper>
              ))}
            </div>
          ) : (
            <div className="library-empty">暂无已保存组件</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SavedComponentPanel);

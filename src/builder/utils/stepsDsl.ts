import type { UiTreeNode } from '../store/types';

export type DslStepRow = {
  key: string;
  title: string;
  content: string;
  status?: 'default' | 'process' | 'finish' | 'error';
  value?: string | number;
};

/** 从 DSL 子节点收集步骤条项（物料 Steps + Steps.Item，与 dataComponents / PreviewRenderer 一致） */
export function collectDslStepRows(children: UiTreeNode[] | undefined): DslStepRow[] {
  return (children ?? [])
    .filter((child) => (typeof child.type === 'string' ? child.type.trim() : child.type) === 'Steps.Item')
    .filter((child) => {
      const visibleProp = (child.props?.visible as { value?: unknown } | undefined)?.value;
      return visibleProp !== false;
    })
    .map((child) => {
      const getStepProp = (propName: string) => {
        const prop = child.props?.[propName] as { value?: unknown } | undefined;
        return prop?.value;
      };
      const title = getStepProp('title');
      const content = getStepProp('content');
      const status = getStepProp('status');
      const value = getStepProp('value');
      const normalizedStatus =
        status === 'default' || status === 'process' || status === 'finish' || status === 'error'
          ? (status as DslStepRow['status'])
          : undefined;
      const normalizedValue =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? (value.trim() ? value.trim() : undefined)
            : undefined;
      return {
        key: child.key,
        title: typeof title === 'string' ? title : '',
        content: typeof content === 'string' ? content : '',
        status: normalizedStatus,
        value: normalizedValue,
      };
    });
}

/** TDesign DSL 的 default → antd Steps item.status 的 wait */
export function dslStepStatusToAntd(
  status: DslStepRow['status'],
): 'wait' | 'process' | 'finish' | 'error' | undefined {
  if (!status || status === 'default') {
    return 'wait';
  }
  return status;
}

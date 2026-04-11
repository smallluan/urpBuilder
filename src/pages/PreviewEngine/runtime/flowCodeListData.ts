import type { Node } from '@xyflow/react';
import type { CodeNodeData } from '../../../types/flow';
import type { ComponentDataSourceConfig } from '../../../types/dataSource';
import { pickByPath } from '../../../types/dataSource';
import type { RuntimeEvent } from '../../../types/flowRuntime';
import type { PreviewDataHub } from './dataHub';
import { extractExecutableBodyFromFlowCodeNodeSource } from '../../../builder/components/codeEditor/flowCodeNodeSource';
import { buildFlowCodeNodeFunctionSource } from './flowCodeSandbox';

/**
 * 为动态列表拉取数据：直接执行代码节点函数并取返回值（不经事件流的 patch 语义）。
 */
export async function evaluateFlowCodeNodeForList(params: {
  flowNodes: Node[];
  config: ComponentDataSourceConfig;
  dataHub: PreviewDataHub;
}): Promise<unknown> {
  const { flowNodes, config, dataHub } = params;
  if (config.type !== 'flowCode' || !config.flowCodeNodeId) {
    return undefined;
  }

  const node = flowNodes.find((n) => n.id === config.flowCodeNodeId);
  if (!node || node.type !== 'codeNode') {
    throw new Error('未找到流程中的代码节点');
  }

  const data = (node.data ?? {}) as CodeNodeData;
  const raw = typeof data.code === 'string' ? data.code : '';
  const executableBody = extractExecutableBodyFromFlowCodeNodeSource(raw).trim();
  if (!executableBody) {
    throw new Error('代码节点内容为空');
  }

  const listBootstrap: RuntimeEvent = {
    kind: 'lifecycle',
    lifetime: 'onMounted',
    componentKey: '',
    payload: { kind: 'listDataBootstrap' },
  };

  const ctx: Record<string, unknown> = {
    event: listBootstrap,
    upstreamNodeId: '',
    currentNodeId: node.id,
  };

  const fnSource = buildFlowCodeNodeFunctionSource(executableBody);
  const executor = new Function('dataHub', 'ctx', fnSource) as (
    hub: ReturnType<PreviewDataHub['createCodeContext']>,
    c: Record<string, unknown>,
  ) => Promise<unknown>;

  const result = await executor(dataHub.createCodeContext(), ctx);

  const arrayPath = String(data.listOutputContract?.arrayPath ?? '').trim();
  let rowsUnknown: unknown = result;
  if (arrayPath) {
    rowsUnknown = pickByPath(result, arrayPath);
  }

  return rowsUnknown;
}

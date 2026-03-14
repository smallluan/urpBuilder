/**
 * 向后兼容的类型代理文件。
 * 所有类型已迁移至 builder/store/types，此处统一再导出。
 * 项目内现有的 `import { UiTreeNode } from '../store/type'` 等写法无需修改。
 */

// 统一从 builder 导出所有类型
export * from '../../../builder/store/types';

// CreateComponentStore 作为 BuilderStore 的别名，保持向后兼容
export type { BuilderStore as CreateComponentStore } from '../../../builder/store/types';

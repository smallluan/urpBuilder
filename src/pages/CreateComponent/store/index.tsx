/**
 * CreateComponent store 使用 builder 工厂 createBuilderStore 构建。
 * 此文件保持 useCreateComponentStore 导出名不变，所有业务代码可零改造继续使用。
 */
import { v4 as uuidv4 } from 'uuid';
import { createBuilderStore } from '../../../builder/store/createBuilderStore';

/**
 * CreateComponent 专属的 store 实例。
 * initialRootNode 注入组件级 lifetimes（区别于页面级的生命周期集合）。
 */
export const useCreateComponentStore = createBuilderStore({
  initialRootNode: {
    key: uuidv4(),
    label: '该组件',
    props: {},
    lifetimes: [
      'onInit',
      'onBeforeMount',
      'onMounted',
      'onBeforeUpdate',
      'onUpdated',
      'onBeforeUnmount',
      'onUnmounted',
    ],
  },
});

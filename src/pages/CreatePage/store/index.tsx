import { v4 as uuidv4 } from 'uuid';
import { createBuilderStore } from '../../../builder/store/createBuilderStore';

export const useCreatePageStore = createBuilderStore({
  initialRootNode: {
    key: uuidv4(),
    label: '该页面',
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

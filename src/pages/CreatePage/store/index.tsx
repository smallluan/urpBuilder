import { v4 as uuidv4 } from 'uuid';
import { createBuilderStore } from '../../../builder/store/createBuilderStore';
import { buildNodesByLayoutTemplate } from '../../../builder/config/layoutTemplates';

export const useCreatePageStore = createBuilderStore({
  buildLayoutNodes: buildNodesByLayoutTemplate,
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
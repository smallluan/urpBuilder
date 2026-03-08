const componentCatalog = [
  {
    type: 'Button',
    name: '按钮',
    props: {
      theme: {
        name: '主题',
        value: 'primary',
        editType: 'select',  // 通过何种方式修改此属性
        payload: {
          options: ['primary', 'success', 'warning', 'error', 'default']
        }
      },
      shape: {
        name: '形状',
        value: 'rect',
        editType: 'select',
        payload: {
          options: ['rect', 'round']
        }
      },
      size: {
        name: '尺寸',
        value: 'normal',
        editType: 'select',
        payload: {
          options: ['normal', 'small', 'large']
        }
      },
      variant: {
        name: '变体',
        value: 'base',
        editType: 'select',
        payload: {
          options: ['base', 'outline', 'dashed', 'text']
        }
      },
      content: {
        name: '内容',
        value: '确定',
        editType: 'input'
      },
      block: {
        name: '块级元素',
        value: false,
        editType: 'switch'
      }
    },
    lifetimes: ['onClick']
  },
  {
    type: 'Space',
    name: '间隔',
    props: {
      align: {
        name: '对齐方式',
        value: 'start',
        editType: 'select',
        payload: {
          options: ['start', 'end', 'center', 'baseline']
        }
      },
      direction: {
        name: '间距方向',
        value: 'horizontal',
        editType: 'select',
        payload: {
          options: ['horizontal', 'vertical']
        }
      },
      size: {
        name: '间距大小',
        value: 8,
        editType: 'inputNumber'
      },
      breakLine: {
        name: '自动换行',
        value: false,
        editType: 'switch'
      }
    }
  },
  {
    type: 'Grid.Row',
    name: '栅格行',
    props: {
      align: {
        name: '纵向对齐',
        value: 'top',
        editType: 'select',
        payload: {
          options: ['top', 'middle', 'bottom', 'stretch', 'baseline']
        }
      },
      gutter: {
        name: '栅格间隔',
        value: 0,
        editType: 'inputNumber',
      }
    }
  },
  {
    type: 'Grid.Col',
    name: '栅格列',
    props: {
      span: {
        name: '占栅格数',
        value: 4,
        editType: 'inputNumber',
      }
    }
  }
];

export default componentCatalog;

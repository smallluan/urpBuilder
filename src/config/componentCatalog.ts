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
      },
      splitEnabled: {
        name: '使用分割线',
        value: false,
        editType: 'switch'
      },
      splitDashed: {
        name: '分割线虚线',
        value: false,
        editType: 'switch'
      },
      splitAlign: {
        name: '分割线文本位置',
        value: 'center',
        editType: 'select',
        payload: {
          options: ['left', 'center', 'right']
        }
      },
      splitContent: {
        name: '分割线文本',
        value: '',
        editType: 'input'
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
      justify: {
        name: '水平排列',
        value: 'start',
        editType: 'select',
        payload: {
          options: ['start', 'end', 'center', 'space-around', 'space-between']
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
        value: 6,
        editType: 'inputNumber',
      },
      offset: {
        name: '左侧空格',
        value: 0,
        editType: 'inputNumber',
      }
    }
  },
  {
    type: 'Layout',
    name: '布局容器',
    props: {}
  },
  {
    type: 'Layout.Header',
    name: '布局头部',
    props: {}
  },
  {
    type: 'Layout.Content',
    name: '布局内容',
    props: {}
  },
  {
    type: 'Layout.Aside',
    name: '布局侧栏',
    props: {}
  },
  {
    type: 'Layout.Footer',
    name: '布局底部',
    props: {}
  },
  {
    type: 'Card',
    name: '卡片',
    props: {
      title: {
        name: '标题',
        value: '卡片标题',
        editType: 'input'
      },
      subtitle: {
        name: '副标题',
        value: '',
        editType: 'input'
      },
      content: {
        name: '默认内容',
        value: '卡片内容',
        editType: 'input'
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['medium', 'small']
        }
      },
      bordered: {
        name: '显示边框',
        value: true,
        editType: 'switch'
      },
      headerBordered: {
        name: '头部分割线',
        value: false,
        editType: 'switch'
      },
      shadow: {
        name: '显示阴影',
        value: false,
        editType: 'switch'
      },
      hoverShadow: {
        name: '悬浮阴影',
        value: false,
        editType: 'switch'
      }
    }
  },
  {
    type: 'Image',
    name: '图片',
    props: {
      src: {
        name: '图片地址',
        value: 'https://tdesign.gtimg.com/demo/demo-image-1.png',
        editType: 'input'
      },
      alt: {
        name: '描述文本',
        value: '图片',
        editType: 'input'
      },
      fit: {
        name: '填充模式',
        value: 'cover',
        editType: 'select',
        payload: {
          options: ['contain', 'cover', 'fill', 'none', 'scale-down']
        }
      },
      shape: {
        name: '圆角类型',
        value: 'square',
        editType: 'select',
        payload: {
          options: ['square', 'round', 'circle']
        }
      }
    }
  },
  {
    type: 'Avatar',
    name: '头像',
    props: {
      image: {
        name: '头像地址',
        value: 'https://tdesign.gtimg.com/site/avatar.jpg',
        editType: 'input'
      },
      alt: {
        name: '替代文本',
        value: '用户',
        editType: 'input'
      },
      content: {
        name: '默认文本',
        value: 'U',
        editType: 'input'
      },
      shape: {
        name: '形状',
        value: 'circle',
        editType: 'select',
        payload: {
          options: ['circle', 'round', 'square']
        }
      },
      size: {
        name: '尺寸',
        value: '40px',
        editType: 'input'
      },
      hideOnLoadFailed: {
        name: '失败隐藏图片',
        value: false,
        editType: 'switch'
      }
    }
  },
  {
    type: 'Switch',
    name: '开关',
    props: {
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      value: {
        name: '受控值(value)',
        value: false,
        editType: 'switch'
      },
      defaultValue: {
        name: '非受控默认值(defaultValue)',
        value: false,
        editType: 'switch'
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large']
        }
      },
    },
    lifetimes: ['onChange']
  },
  {
    type: 'Calendar',
    name: '日历',
    props: {
      theme: {
        name: '风格',
        value: 'full',
        editType: 'select',
        payload: {
          options: ['full', 'card']
        }
      },
      mode: {
        name: '展示维度',
        value: 'month',
        editType: 'select',
        payload: {
          options: ['month', 'year']
        }
      },
      firstDayOfWeek: {
        name: '每周起始日',
        value: 1,
        editType: 'select',
        payload: {
          options: [1, 2, 3, 4, 5, 6, 7]
        }
      },
      format: {
        name: '日期格式',
        value: 'YYYY-MM-DD',
        editType: 'input'
      },
      fillWithZero: {
        name: '日期补零',
        value: true,
        editType: 'switch'
      },
      isShowWeekendDefault: {
        name: '默认显示周末',
        value: true,
        editType: 'switch'
      },
      controllerConfig: {
        name: '显示右上角控制器',
        value: true,
        editType: 'switch'
      },
      preventCellContextmenu: {
        name: '禁用单元格右键菜单',
        value: false,
        editType: 'switch'
      },
      value: {
        name: '高亮日期(value)',
        value: '',
        editType: 'input'
      }
    },
    lifetimes: ['onCellClick', 'onCellDoubleClick', 'onCellRightClick', 'onControllerChange', 'onMonthChange']
  },
  {
    type: 'ColorPicker',
    name: '颜色选择器',
    props: {
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      format: {
        name: '色值格式',
        value: 'RGB',
        editType: 'select',
        payload: {
          options: ['HEX', 'HEX8', 'RGB', 'RGBA', 'HSL', 'HSLA', 'HSV', 'HSVA', 'CMYK', 'CSS']
        }
      },
      value: {
        name: '色值(value)',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认色值(defaultValue)',
        value: '',
        editType: 'input'
      },
      clearable: {
        name: '允许清空',
        value: false,
        editType: 'switch'
      },
      borderless: {
        name: '无边框',
        value: false,
        editType: 'switch'
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch'
      },
      enableAlpha: {
        name: '启用透明通道',
        value: false,
        editType: 'switch'
      },
      showPrimaryColorPreview: {
        name: '显示主色预览',
        value: true,
        editType: 'switch'
      }
    },
    lifetimes: ['onChange', 'onClear', 'onPaletteBarChange', 'onRecentColorsChange']
  },
  {
    type: 'TimePicker',
    name: '时间选择器',
    props: {
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      format: {
        name: '时间格式',
        value: 'HH:mm:ss',
        editType: 'input'
      },
      value: {
        name: '时间值(value)',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认时间(defaultValue)',
        value: '',
        editType: 'input'
      },
      placeholder: {
        name: '占位文本',
        value: '',
        editType: 'input'
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large']
        }
      },
      status: {
        name: '状态',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'success', 'warning', 'error']
        }
      },
      steps: {
        name: '步长(时,分,秒)',
        value: '1,1,1',
        editType: 'input'
      },
      allowInput: {
        name: '允许输入',
        value: false,
        editType: 'switch'
      },
      borderless: {
        name: '无边框',
        value: false,
        editType: 'switch'
      },
      clearable: {
        name: '可清空',
        value: false,
        editType: 'switch'
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch'
      },
      hideDisabledTime: {
        name: '隐藏禁用时间',
        value: true,
        editType: 'switch'
      }
    },
    lifetimes: ['onBlur', 'onChange', 'onClear', 'onClose', 'onFocus', 'onInput', 'onOpen', 'onPick']
  },
  {
    type: 'TimeRangePicker',
    name: '时间范围选择器',
    props: {
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      format: {
        name: '时间格式',
        value: 'HH:mm:ss',
        editType: 'input'
      },
      value: {
        name: '范围值(value)',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认范围(defaultValue)',
        value: '',
        editType: 'input'
      },
      placeholderStart: {
        name: '开始占位',
        value: '开始时间',
        editType: 'input'
      },
      placeholderEnd: {
        name: '结束占位',
        value: '结束时间',
        editType: 'input'
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large']
        }
      },
      status: {
        name: '状态',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'success', 'warning', 'error']
        }
      },
      steps: {
        name: '步长(时,分,秒)',
        value: '1,1,1',
        editType: 'input'
      },
      allowInput: {
        name: '允许输入',
        value: false,
        editType: 'switch'
      },
      autoSwap: {
        name: '自动交换顺序',
        value: true,
        editType: 'switch'
      },
      borderless: {
        name: '无边框',
        value: false,
        editType: 'switch'
      },
      clearable: {
        name: '可清空',
        value: false,
        editType: 'switch'
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch'
      },
      hideDisabledTime: {
        name: '隐藏禁用时间',
        value: true,
        editType: 'switch'
      }
    },
    lifetimes: ['onBlur', 'onChange', 'onFocus', 'onInput', 'onPick']
  },
  {
    type: 'InputNumber',
    name: '数字输入框',
    props: {
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      value: {
        name: '值(value)',
        value: 0,
        editType: 'input'
      },
      defaultValue: {
        name: '默认值(defaultValue)',
        value: 0,
        editType: 'input'
      },
      placeholder: {
        name: '占位文本',
        value: '',
        editType: 'input'
      },
      min: {
        name: '最小值(min)',
        value: '',
        editType: 'input'
      },
      max: {
        name: '最大值(max)',
        value: '',
        editType: 'input'
      },
      step: {
        name: '步长(step)',
        value: 1,
        editType: 'input'
      },
      decimalPlaces: {
        name: '小数位数',
        value: 0,
        editType: 'inputNumber'
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large']
        }
      },
      status: {
        name: '状态',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'success', 'warning', 'error']
        }
      },
      align: {
        name: '文本对齐',
        value: 'left',
        editType: 'select',
        payload: {
          options: ['left', 'center', 'right']
        }
      },
      theme: {
        name: '按钮布局',
        value: 'row',
        editType: 'select',
        payload: {
          options: ['column', 'row', 'normal']
        }
      },
      allowInputOverLimit: {
        name: '允许超限输入',
        value: true,
        editType: 'switch'
      },
      autoWidth: {
        name: '自动宽度',
        value: false,
        editType: 'switch'
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch'
      },
      readOnly: {
        name: '只读',
        value: false,
        editType: 'switch'
      },
      largeNumber: {
        name: '大数模式',
        value: false,
        editType: 'switch'
      }
    },
    lifetimes: ['onBlur', 'onChange', 'onEnter', 'onFocus', 'onKeydown', 'onKeypress', 'onKeyup', 'onValidate']
  },
  {
    type: 'Swiper',
    name: '轮播图',
    props: {
      images: {
        name: '图片配置',
        value: [
          {
            src: 'https://tdesign.gtimg.com/demo/demo-image-1.png',
            fallback: 'https://tdesign.gtimg.com/demo/demo-image-4.png',
            lazy: true,
            objectFit: 'cover',
            objectPosition: 'center',
          },
          {
            src: 'https://tdesign.gtimg.com/demo/demo-image-2.png',
            fallback: 'https://tdesign.gtimg.com/demo/demo-image-5.png',
            lazy: true,
            objectFit: 'cover',
            objectPosition: 'center',
          },
        ],
        editType: 'swiperImages'
      },
      height: {
        name: '高度(px)',
        value: 240,
        editType: 'inputNumber'
      }
    }
  },
  {
    type: 'Divider',
    name: '分割线',
    props: {
      align: {
        name: '文本位置',
        value: 'center',
        editType: 'select',
        payload: {
          options: ['left', 'center', 'right']
        }
      },
      dashed: {
        name: '虚线样式',
        value: false,
        editType: 'switch'
      },
      size: {
        name: '间距大小',
        value: 0,
        editType: 'inputNumber'
      },
      content: {
        name: '文本内容',
        value: '',
        editType: 'input'
      }
    }
  },
  {
    type: 'Typography.Title',
    name: '标题文本',
    props: {
      content: {
        name: '文本内容',
        value: '标题内容',
        editType: 'input'
      },
      level: {
        name: '标题级别',
        value: 'h4',
        editType: 'select',
        payload: {
          options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        }
      }
    }
  },
  {
    type: 'Typography.Paragraph',
    name: '段落文本',
    props: {
      content: {
        name: '文本内容',
        value: '这是一段可编辑的段落文本。',
        editType: 'input'
      }
    }
  },
  {
    type: 'Typography.Text',
    name: '普通文本',
    props: {
      content: {
        name: '文本内容',
        value: '这是一段普通文本',
        editType: 'input'
      },
      theme: {
        name: '文本主题',
        value: 'primary',
        editType: 'select',
        payload: {
          options: ['primary', 'secondary', 'success', 'warning', 'error']
        }
      },
      strong: {
        name: '加粗',
        value: false,
        editType: 'switch'
      },
      underline: {
        name: '下划线',
        value: false,
        editType: 'switch'
      },
      delete: {
        name: '删除线',
        value: false,
        editType: 'switch'
      },
      code: {
        name: '代码样式',
        value: false,
        editType: 'switch'
      },
      mark: {
        name: '高亮标记',
        value: false,
        editType: 'switch'
      }
    }
  }
];

export default componentCatalog;

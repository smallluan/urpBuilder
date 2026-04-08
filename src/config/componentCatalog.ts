import type { EChartSeriesType } from '../constants/echart';
import { ECHART_OPTION_PRESET_OPTIONS, ECHART_TYPE_OPTIONS } from '../constants/echart';

const createChartDefaultData = (chartType: EChartSeriesType) => {
  if (chartType === 'sankey' || chartType === 'graph') {
    return [
      { source: '访问', target: '注册', value: 120, category: '流量' },
      { source: '注册', target: '付费', value: 64, category: '转化' },
      { source: '注册', target: '流失', value: 32, category: '流失' },
    ];
  }

  if (chartType === 'map') {
    return [
      { name: '北区', value: 120 },
      { name: '中区', value: 200 },
      { name: '南区', value: 160 },
    ];
  }

  if (chartType === 'candlestick') {
    return [
      { name: '周一', open: 12, close: 15, low: 10, high: 18 },
      { name: '周二', open: 15, close: 13, low: 12, high: 16 },
      { name: '周三', open: 13, close: 17, low: 11, high: 19 },
    ];
  }

  if (chartType === 'boxplot') {
    return [
      { name: '样本一', min: 12, q1: 18, median: 22, q3: 28, max: 36 },
      { name: '样本二', min: 14, q1: 20, median: 25, q3: 30, max: 38 },
    ];
  }

  return [
    { name: '周一', value: 120 },
    { name: '周二', value: 200 },
    { name: '周三', value: 150 },
    { name: '周四', value: 80 },
    { name: '周五', value: 70 },
  ];
};

const createChartComponent = (
  type: string,
  name: string,
  chartType: EChartSeriesType,
) => ({
  type,
  name,
  props: {
    chartType: {
      name: '图表类型',
      value: chartType,
      editType: 'select',
      payload: {
        options: ECHART_TYPE_OPTIONS,
      },
    },
    dataSource: {
      name: '图表数据',
      value: createChartDefaultData(chartType),
      editType: 'jsonCode',
    },
    dataSourceConfig: {
      name: '数据源配置',
      value: {
        type: 'static',
        responsePath: 'output',
        page: 1,
        pageSize: 20,
      },
      editType: 'dataSourceConfig',
    },
    xField: {
      name: '横轴字段',
      value: 'name',
      editType: 'input',
    },
    yField: {
      name: '纵轴字段',
      value: 'value',
      editType: 'input',
    },
    openField: {
      name: '开盘字段',
      value: 'open',
      editType: 'input',
    },
    closeField: {
      name: '收盘字段',
      value: 'close',
      editType: 'input',
    },
    lowField: {
      name: '最低字段',
      value: 'low',
      editType: 'input',
    },
    highField: {
      name: '最高字段',
      value: 'high',
      editType: 'input',
    },
    nameField: {
      name: '饼图名称字段',
      value: 'name',
      editType: 'input',
    },
    valueField: {
      name: '饼图数值字段',
      value: 'value',
      editType: 'input',
    },
    smooth: {
      name: '折线平滑',
      value: true,
      editType: 'switch',
    },
    sourceField: {
      name: '起点字段',
      value: 'source',
      editType: 'input',
    },
    targetField: {
      name: '终点字段',
      value: 'target',
      editType: 'input',
    },
    categoryField: {
      name: '分类字段',
      value: 'category',
      editType: 'input',
    },
    childrenField: {
      name: '子节点字段',
      value: 'children',
      editType: 'input',
    },
    mapName: {
      name: '地图名',
      value: 'china',
      editType: 'input',
    },
    minField: {
      name: '最小值字段',
      value: 'min',
      editType: 'input',
    },
    q1Field: {
      name: '下四分位字段',
      value: 'q1',
      editType: 'input',
    },
    medianField: {
      name: '中位数字段',
      value: 'median',
      editType: 'input',
    },
    q3Field: {
      name: '上四分位字段',
      value: 'q3',
      editType: 'input',
    },
    maxField: {
      name: '最大值字段',
      value: 'max',
      editType: 'input',
    },
    min: {
      name: '最小值',
      value: 0,
      editType: 'inputNumber',
    },
    max: {
      name: '最大值',
      value: 100,
      editType: 'inputNumber',
    },
    splitNumber: {
      name: '刻度分段',
      value: 5,
      editType: 'inputNumber',
    },
    sort: {
      name: '排序',
      value: 'descending',
      editType: 'select',
      payload: {
        options: [
          { label: '降序', value: 'descending' },
          { label: '升序', value: 'ascending' },
        ],
      },
    },
    showLegend: {
      name: '显示图例',
      value: true,
      editType: 'switch',
    },
    height: {
      name: '高度',
      value: 320,
      editType: 'inputNumber',
      payload: {
        min: 120,
        max: 1200,
      },
    },
    optionPreset: {
      name: '预设模板',
      value: 'none',
      editType: 'select',
      payload: {
        options: ECHART_OPTION_PRESET_OPTIONS.map((item) => ({ label: item.label, value: item.value })),
      },
    },
    option: {
      name: '高级配置',
      value: {},
      editType: 'jsonCode',
    },
  },
  lifetimes: ['onClick'],
});

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
      prefixIconName: {
        name: '前置图标',
        value: '',
        editType: 'iconSelect'
      },
      suffixIconName: {
        name: '后置图标',
        value: '',
        editType: 'iconSelect'
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
    type: 'Link',
    name: '链接',
    props: {
      content: {
        name: '链接文本',
        value: '点击查看',
        editType: 'input'
      },
      href: {
        name: '跳转地址',
        value: '',
        editType: 'input'
      },
      target: {
        name: '打开方式',
        value: '_self',
        editType: 'select',
        payload: {
          options: ['_self', '_blank', '_parent', '_top']
        }
      },
      theme: {
        name: '主题',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'primary', 'danger', 'warning', 'success']
        }
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large']
        }
      },
      hover: {
        name: '悬浮态',
        value: 'underline',
        editType: 'select',
        payload: {
          options: ['color', 'underline']
        }
      },
      prefixIconName: {
        name: '前置图标',
        value: '',
        editType: 'iconSelect'
      },
      suffixIconName: {
        name: '后置图标',
        value: '',
        editType: 'iconSelect'
      },
      underline: {
        name: '常显下划线',
        value: false,
        editType: 'switch'
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch'
      }
    },
    lifetimes: ['onClick']
  },
  {
    type: 'BackTop',
    name: '返回顶部',
    props: {
      content: {
        name: '内容',
        value: '返回顶部',
        editType: 'input',
      },
      iconName: {
        name: '图标',
        value: '',
        editType: 'iconSelect',
      },
      duration: {
        name: '回顶时长',
        value: 200,
        editType: 'inputNumber',
      },
      offset: {
        name: '位置偏移',
        value: '24px,80px',
        editType: 'input',
      },
      shape: {
        name: '形状',
        value: 'square',
        editType: 'select',
        payload: {
          options: ['circle', 'square'],
        },
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['medium', 'small'],
        },
      },
      theme: {
        name: '主题',
        value: 'light',
        editType: 'select',
        payload: {
          options: ['light', 'primary', 'dark'],
        },
      },
      target: {
        name: '滚动目标',
        value: 'body',
        editType: 'input',
      },
      visibleHeight: {
        name: '出现阈值',
        value: 0,
        editType: 'input',
      },
    },
    lifetimes: ['onClick'],
  },
  {
    type: 'Drawer',
    name: '抽屉',
    props: {
      className: {
        name: '类名',
        value: '',
        editType: 'input',
      },
      body: {
        name: '内容',
        value: '抽屉内容',
        editType: 'input',
      },
      showHeader: {
        name: '显示头部',
        value: true,
        editType: 'switch',
      },
      header: {
        name: '头部内容',
        value: '抽屉标题',
        editType: 'input',
      },
      footer: {
        name: '显示底部操作栏',
        value: true,
        editType: 'switch',
      },
      confirmBtn: {
        name: '确认按钮文本',
        value: '确认',
        editType: 'input',
      },
      cancelBtn: {
        name: '取消按钮文本',
        value: '取消',
        editType: 'input',
      },
      closeBtn: {
        name: '显示关闭按钮',
        value: true,
        editType: 'switch',
      },
      closeOnEscKeydown: {
        name: '退出键关闭',
        value: true,
        editType: 'switch',
      },
      closeOnOverlayClick: {
        name: '点击蒙层关闭',
        value: true,
        editType: 'switch',
      },
      destroyOnClose: {
        name: '关闭销毁',
        value: false,
        editType: 'switch',
      },
      lazy: {
        name: '懒加载',
        value: true,
        editType: 'switch',
      },
      placement: {
        name: '方向',
        value: 'right',
        editType: 'select',
        payload: {
          options: ['left', 'right', 'top', 'bottom'],
        },
      },
      preventScrollThrough: {
        name: '防止滚动穿透',
        value: true,
        editType: 'switch',
      },
      showInAttachedElement: {
        name: '仅挂载元素内显示',
        value: false,
        editType: 'switch',
      },
      showOverlay: {
        name: '显示遮罩层',
        value: true,
        editType: 'switch',
      },
      size: {
        name: '尺寸',
        value: 'small',
        editType: 'input',
      },
      sizeDraggable: {
        name: '拖拽调整尺寸',
        value: false,
        editType: 'switch',
      },
      sizeDragMin: {
        name: '拖拽最小尺寸',
        value: 240,
        editType: 'inputNumber',
      },
      sizeDragMax: {
        name: '拖拽最大尺寸',
        value: 720,
        editType: 'inputNumber',
      },
      visible: {
        name: '可见',
        value: false,
        editType: 'switch',
      },
      zIndex: {
        name: '层级',
        value: 1500,
        editType: 'inputNumber',
      },
    },
    lifetimes: [
      'onBeforeOpen',
      'onBeforeClose',
      'onCancel',
      'onClose',
      'onCloseBtnClick',
      'onConfirm',
      'onEscKeydown',
      'onOverlayClick',
      'onSizeDragEnd',
    ],
  },
  {
    type: 'Popup',
    name: '气泡浮层',
    props: {
      trigger: {
        name: '触发方式',
        value: 'click',
        editType: 'select',
        payload: {
          options: ['click', 'hover', 'focus', 'context-menu'],
        },
      },
      placement: {
        name: '浮层位置',
        value: 'bottom',
        editType: 'select',
        payload: {
          options: [
            'top',
            'top-left',
            'top-right',
            'left',
            'left-top',
            'left-bottom',
            'right',
            'right-top',
            'right-bottom',
            'bottom',
            'bottom-left',
            'bottom-right',
          ],
        },
      },
      showArrow: {
        name: '显示箭头',
        value: true,
        editType: 'switch',
      },
      destroyOnClose: {
        name: '关闭销毁',
        value: false,
        editType: 'switch',
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch',
      },
      showInAttachedElement: {
        name: '仅挂载元素内显示',
        value: true,
        editType: 'switch',
      },
      zIndex: {
        name: '层级',
        value: 2500,
        editType: 'inputNumber',
      },
      overlayInnerClassName: {
        name: '浮层类名',
        value: '',
        editType: 'input',
      },
      overlayClassName: {
        name: '浮层外层类名',
        value: '',
        editType: 'input',
      },
      hideEmptyPopup: {
        name: '空内容隐藏',
        value: true,
        editType: 'switch',
      },
      delay: {
        name: '延迟(ms)',
        value: 0,
        editType: 'inputNumber',
      },
    },
    lifetimes: ['onVisibleChange'],
  },
  {
    type: 'Progress',
    name: '进度条',
    props: {
      color: {
        name: '颜色',
        value: '',
        editType: 'input',
      },
      showLabel: {
        name: '显示标签',
        value: true,
        editType: 'switch',
      },
      labelText: {
        name: '标签文本',
        value: '',
        editType: 'input',
      },
      percentage: {
        name: '百分比',
        value: 0,
        editType: 'inputNumber',
        payload: {
          min: 0,
          max: 100,
        },
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: [
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ],
        },
      },
      status: {
        name: '状态',
        value: 'default',
        editType: 'select',
        payload: {
          options: [
            { label: '默认', value: 'default' },
            { label: '成功', value: 'success' },
            { label: '错误', value: 'error' },
            { label: '警告', value: 'warning' },
            { label: '激活', value: 'active' },
          ],
        },
      },
      strokeWidth: {
        name: '线宽',
        value: undefined,
        editType: 'inputNumber',
        payload: {
          min: 0,
        },
      },
      theme: {
        name: '风格',
        value: 'line',
        editType: 'select',
        payload: {
          options: [
            { label: '线形', value: 'line' },
            { label: '饱满', value: 'plump' },
            { label: '环形', value: 'circle' },
          ],
        },
      },
      trackColor: {
        name: '轨道颜色',
        value: '',
        editType: 'input',
      },
    },
  },
  {
    type: 'Upload',
    name: '上传',
    props: {
      className: {
        name: '类名',
        value: '',
        editType: 'input',
      },
      accept: {
        name: '接受类型',
        value: '',
        editType: 'input',
      },
      action: {
        name: '上传接口',
        value: '',
        editType: 'input',
      },
      allowUploadDuplicateFile: {
        name: '允许同名文件',
        value: false,
        editType: 'switch',
      },
      autoUpload: {
        name: '自动上传',
        value: true,
        editType: 'switch',
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch',
      },
      draggable: {
        name: '启用拖拽',
        value: false,
        editType: 'switch',
      },
      multiple: {
        name: '多文件',
        value: false,
        editType: 'switch',
      },
      max: {
        name: '最大数量',
        value: 0,
        editType: 'inputNumber',
        payload: {
          min: 0,
        },
      },
      method: {
        name: '请求方法',
        value: 'POST',
        editType: 'select',
        payload: {
          options: ['POST', 'GET', 'PUT', 'OPTIONS', 'PATCH'],
        },
      },
      name: {
        name: '文件字段名',
        value: 'file',
        editType: 'input',
      },
      placeholder: {
        name: '占位文本',
        value: '请选择文件',
        editType: 'input',
      },
      showImageFileName: {
        name: '显示图片文件名',
        value: true,
        editType: 'switch',
      },
      showThumbnail: {
        name: '显示缩略图',
        value: false,
        editType: 'switch',
      },
      showUploadProgress: {
        name: '显示上传进度',
        value: true,
        editType: 'switch',
      },
      status: {
        name: '提示状态',
        value: 'default',
        editType: 'select',
        payload: {
          options: [
            { label: '默认', value: 'default' },
            { label: '成功', value: 'success' },
            { label: '警告', value: 'warning' },
            { label: '错误', value: 'error' },
          ],
        },
      },
      theme: {
        name: '风格',
        value: 'file',
        editType: 'select',
        payload: {
          options: [
            { label: '自定义', value: 'custom' },
            { label: '文件', value: 'file' },
            { label: '文件输入框', value: 'file-input' },
            { label: '文件流', value: 'file-flow' },
            { label: '图片', value: 'image' },
            { label: '图片流', value: 'image-flow' },
          ],
        },
      },
      tips: {
        name: '提示文本',
        value: '',
        editType: 'input',
      },
      uploadAllFilesInOneRequest: {
        name: '单请求上传全部',
        value: false,
        editType: 'switch',
      },
      uploadPastedFiles: {
        name: '允许粘贴上传',
        value: true,
        editType: 'switch',
      },
      useMockProgress: {
        name: '启用模拟进度',
        value: true,
        editType: 'switch',
      },
      mockProgressDuration: {
        name: '模拟进度间隔',
        value: 300,
        editType: 'inputNumber',
        payload: {
          min: 0,
        },
      },
      withCredentials: {
        name: '携带凭据',
        value: false,
        editType: 'switch',
      },
      abridgeName: {
        name: '文件名缩略规则',
        value: '',
        editType: 'input',
      },
      files: {
        name: '已上传文件列表',
        value: '[]',
        editType: 'jsonCode',
      },
      defaultFiles: {
        name: '默认文件列表',
        value: '[]',
        editType: 'jsonCode',
      },
      headers: {
        name: '请求头',
        value: '{}',
        editType: 'jsonCode',
      },
      data: {
        name: '附加请求参数',
        value: '{}',
        editType: 'jsonCode',
      },
      sizeLimit: {
        name: '大小限制',
        value: '',
        editType: 'input',
      },
    },
    lifetimes: [
      'onCancelUpload',
      'onChange',
      'onDragenter',
      'onDragleave',
      'onDrop',
      'onFail',
      'onOneFileFail',
      'onOneFileSuccess',
      'onPreview',
      'onProgress',
      'onRemove',
      'onSelectChange',
      'onSuccess',
      'onValidate',
      'onWaitingUploadFilesChange',
    ],
  },
  {
    type: 'Icon',
    name: '图标',
    props: {
      iconName: {
        name: '图标名称',
        value: 'CircleHelp',
        editType: 'iconSelect'
      },
      size: {
        name: '图标尺寸',
        value: 16,
        editType: 'inputNumber'
      },
      strokeWidth: {
        name: '线条粗细',
        value: 2,
        editType: 'inputNumber'
      }
    }
  },
  {
    type: 'Flex',
    name: '弹性布局容器',
    props: {
      direction: {
        name: '主轴方向',
        value: 'row',
        editType: 'select',
        payload: {
          options: ['row', 'column', 'row-reverse', 'column-reverse'],
        },
      },
      justify: {
        name: '主轴对齐',
        value: 'flex-start',
        editType: 'select',
        payload: {
          options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        },
      },
      align: {
        name: '交叉轴对齐',
        value: 'stretch',
        editType: 'select',
        payload: {
          options: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
        },
      },
      wrap: {
        name: '换行',
        value: false,
        editType: 'switch',
      },
      gap: {
        name: '间距',
        value: 8,
        editType: 'inputNumber',
      },
    },
  },
  {
    type: 'Flex.Item',
    name: '弹性布局子项',
    props: {
      grow: {
        name: '放大系数',
        value: 0,
        editType: 'inputNumber',
      },
      shrink: {
        name: '缩小系数',
        value: 1,
        editType: 'inputNumber',
      },
      basis: {
        name: '基础尺寸',
        value: 'auto',
        editType: 'input',
      },
      alignSelf: {
        name: '自身对齐',
        value: '',
        editType: 'select',
        payload: {
          options: ['', 'auto', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
        },
      },
    },
  },
  {
    type: 'Stack',
    name: '纵向堆叠',
    props: {
      justify: {
        name: '主轴对齐',
        value: 'flex-start',
        editType: 'select',
        payload: {
          options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        },
      },
      align: {
        name: '交叉轴对齐',
        value: 'stretch',
        editType: 'select',
        payload: {
          options: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
        },
      },
      gap: {
        name: '间距',
        value: 8,
        editType: 'inputNumber',
      },
    },
  },
  {
    type: 'Inline',
    name: '横向排列',
    props: {
      justify: {
        name: '主轴对齐',
        value: 'flex-start',
        editType: 'select',
        payload: {
          options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
        },
      },
      align: {
        name: '交叉轴对齐',
        value: 'center',
        editType: 'select',
        payload: {
          options: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
        },
      },
      wrap: {
        name: '换行',
        value: false,
        editType: 'switch',
      },
      gap: {
        name: '间距',
        value: 8,
        editType: 'inputNumber',
      },
    },
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
    type: 'RouteOutlet',
    name: '路由出口',
    props: {
      minHeight: {
        name: '最小高度',
        value: 360,
        editType: 'inputNumber',
      },
      borderless: {
        name: '隐藏边框',
        value: false,
        editType: 'switch',
      },
    }
  },
  {
    type: 'ComponentSlotOutlet',
    name: '组件插槽',
    props: {
      slotKey: {
        name: '插槽标识',
        value: 'default',
        editType: 'input',
      },
      slotLabel: {
        name: '插槽标题',
        value: '默认插槽',
        editType: 'input',
      },
      emptyText: {
        name: '空态文案',
        value: '拖拽组件到此插槽',
        editType: 'input',
      },
    },
  },
  {
    type: 'Table',
    name: '表格',
    props: {
      rowKey: {
        name: '行唯一键',
        value: 'id',
        editType: 'input',
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large'],
        },
      },
      bordered: {
        name: '显示边框',
        value: true,
        editType: 'switch',
      },
      stripe: {
        name: '斑马纹',
        value: false,
        editType: 'switch',
      },
      hover: {
        name: '行悬浮高亮',
        value: true,
        editType: 'switch',
      },
      tableLayout: {
        name: '布局模式',
        value: 'fixed',
        editType: 'select',
        payload: {
          options: ['auto', 'fixed'],
        },
      },
      maxHeight: {
        name: '最大高度',
        value: 360,
        editType: 'inputNumber',
      },
      paginationEnabled: {
        name: '启用分页',
        value: true,
        editType: 'switch',
      },
      pageSize: {
        name: '每页条数',
        value: 5,
        editType: 'inputNumber',
        payload: {
          min: 1,
          max: 100,
        },
      },
      columns: {
        name: '列配置',
        value: [
          {
            colKey: 'name',
            title: '姓名',
            width: 140,
            align: 'left',
            ellipsis: true,
            sortType: '',
            fixed: '',
          },
          {
            colKey: 'role',
            title: '角色',
            width: 120,
            align: 'left',
            ellipsis: true,
            sortType: '',
            fixed: '',
          },
          {
            colKey: 'status',
            title: '状态',
            width: 120,
            align: 'center',
            ellipsis: false,
            sortType: '',
            fixed: '',
          },
        ],
        editType: 'tableColumnsConfig',
      },
      dataSource: {
        name: '表格数据',
        value: [
          { id: 'u-001', name: '张三', role: '管理员', status: '启用' },
          { id: 'u-002', name: '李四', role: '编辑', status: '启用' },
          { id: 'u-003', name: '王五', role: '访客', status: '禁用' },
        ],
        editType: 'tableDataConfig',
      },
      dataSourceConfig: {
        name: '数据源配置',
        value: {
          type: 'static',
          responsePath: 'output',
          page: 1,
          pageSize: 20,
        },
        editType: 'dataSourceConfig',
      },
    },
    lifetimes: ['onRowClick', 'onPageChange', 'onSortChange', 'onFilterChange'],
  },
  {
    type: 'List',
    name: '列表',
    props: {
      customTemplateEnabled: {
        name: '自定义数据格式',
        value: false,
        editType: 'switch'
      },
      titleField: {
        name: '标题字段',
        value: 'title',
        editType: 'input'
      },
      descriptionField: {
        name: '描述字段',
        value: 'description',
        editType: 'input'
      },
      imageField: {
        name: '图片字段',
        value: 'image',
        editType: 'input'
      },
      actionField: {
        name: '操作文案字段',
        value: 'actionText',
        editType: 'input'
      },
      layout: {
        name: '排列方式',
        value: 'horizontal',
        editType: 'select',
        payload: {
          options: ['horizontal', 'vertical']
        }
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large']
        }
      },
      split: {
        name: '显示分割线',
        value: false,
        editType: 'switch'
      },
      stripe: {
        name: '显示斑马纹',
        value: false,
        editType: 'switch'
      },
      header: {
        name: '头部文本',
        value: '',
        editType: 'input'
      },
      footer: {
        name: '底部文本',
        value: '',
        editType: 'input'
      },
      asyncLoading: {
        name: '加载态',
        value: '',
        editType: 'select',
        payload: {
          options: ['', 'loading', 'load-more']
        }
      }
    },
    lifetimes: ['onLoadMore', 'onScroll', 'onItemClick', 'onActionClick']
  },
  {
    type: 'List.Item',
    name: '列表项抽象',
    props: {
      showImage: {
        name: '显示图片',
        value: true,
        editType: 'switch'
      },
      showDescription: {
        name: '显示描述',
        value: true,
        editType: 'switch'
      },
      showAction: {
        name: '显示操作按钮',
        value: true,
        editType: 'switch'
      },
      actionTheme: {
        name: '按钮主题',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'primary', 'danger', 'warning', 'success']
        }
      },
      actionVariant: {
        name: '按钮风格',
        value: 'text',
        editType: 'select',
        payload: {
          options: ['base', 'outline', 'dashed', 'text']
        }
      },
      actionSize: {
        name: '按钮尺寸',
        value: 'small',
        editType: 'select',
        payload: {
          options: ['small', 'medium', 'large']
        }
      }
    }
  },
  {
    type: 'Steps',
    name: '步骤条',
    props: {
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      current: {
        name: '当前步骤',
        value: '0',
        editType: 'input'
      },
      defaultCurrent: {
        name: '默认步骤',
        value: '0',
        editType: 'input'
      },
      layout: {
        name: '布局方向',
        value: 'horizontal',
        editType: 'select',
        payload: {
          options: ['horizontal', 'vertical']
        }
      },
      readOnly: {
        name: '只读',
        value: false,
        editType: 'switch'
      },
      separator: {
        name: '分隔符',
        value: 'line',
        editType: 'select',
        payload: {
          options: ['line', 'dashed', 'arrow']
        }
      },
      sequence: {
        name: '步骤顺序',
        value: 'positive',
        editType: 'select',
        payload: {
          options: ['positive', 'reverse']
        }
      },
      theme: {
        name: '风格',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'dot']
        }
      }
    },
    lifetimes: ['onChange']
  },
  {
    type: 'Steps.Item',
    name: '步骤项',
    props: {
      title: {
        name: '标题',
        value: '步骤项',
        editType: 'input'
      },
      content: {
        name: '描述',
        value: '',
        editType: 'input'
      },
      status: {
        name: '状态',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'process', 'finish', 'error']
        }
      },
      value: {
        name: '标识',
        value: '',
        editType: 'input'
      }
    }
  },
  {
    type: 'Tabs',
    name: '选项卡',
    props: {
      list: {
        name: '面板配置',
        value: [
          {
            value: 'tab-1',
            label: '选项卡1',
            disabled: false,
            draggable: true,
            removable: false,
            lazy: false,
            destroyOnHide: true,
          },
          {
            value: 'tab-2',
            label: '选项卡2',
            disabled: false,
            draggable: true,
            removable: false,
            lazy: false,
            destroyOnHide: true,
          },
        ],
        editType: 'tabsConfig',
      },
      action: {
        name: '右侧操作文案',
        value: '',
        editType: 'input',
      },
      addable: {
        name: '允许新增',
        value: false,
        editType: 'switch',
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch',
      },
      dragSort: {
        name: '启用拖拽排序',
        value: false,
        editType: 'switch',
      },
      placement: {
        name: '位置',
        value: 'top',
        editType: 'select',
        payload: {
          options: ['left', 'top', 'bottom', 'right'],
        },
      },
      scrollPosition: {
        name: '滚动停留位置',
        value: 'auto',
        editType: 'select',
        payload: {
          options: ['auto', 'start', 'center', 'end'],
        },
      },
      size: {
        name: '尺寸',
        value: 'medium',
        editType: 'select',
        payload: {
          options: ['medium', 'large'],
        },
      },
      theme: {
        name: '风格',
        value: 'normal',
        editType: 'select',
        payload: {
          options: ['normal', 'card'],
        },
      },
      value: {
        name: '当前值',
        value: '',
        editType: 'input',
      },
      defaultValue: {
        name: '默认值',
        value: 'tab-1',
        editType: 'input',
      },
    },
    lifetimes: ['onAdd', 'onChange', 'onDragSort', 'onRemove'],
  },
  {
    type: 'Collapse',
    name: '折叠面板',
    props: {
      list: {
        name: '面板配置',
        value: [
          {
            value: 'collapse-1',
            label: '面板 1',
            disabled: false,
            destroyOnCollapse: true,
          },
          {
            value: 'collapse-2',
            label: '面板 2',
            disabled: false,
            destroyOnCollapse: true,
          },
        ],
        editType: 'tabsConfig',
      },
      value: {
        name: '当前展开',
        value: '',
        editType: 'input',
      },
      defaultValue: {
        name: '默认展开',
        value: 'collapse-1',
        editType: 'input',
      },
      defaultExpandAll: {
        name: '默认全部展开',
        value: false,
        editType: 'switch',
      },
      expandMutex: {
        name: '手风琴模式',
        value: false,
        editType: 'switch',
      },
      bordered: {
        name: '显示边框',
        value: true,
        editType: 'switch',
      },
      expandIconPlacement: {
        name: '图标位置',
        value: 'left',
        editType: 'select',
        payload: {
          options: ['left', 'right'],
        },
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch',
      },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'HeadMenu',
    name: '顶部菜单',
    props: {
      expandType: {
        name: '展开方式',
        value: 'normal',
        editType: 'select',
        payload: {
          options: ['normal', 'popup'],
        },
      },
      expanded: {
        name: '展开项',
        value: [],
        editType: 'menuSubmenuMultiSelect',
      },
      defaultExpanded: {
        name: '默认展开项',
        value: [],
        editType: 'menuSubmenuMultiSelect',
      },
      theme: {
        name: '主题',
        value: 'light',
        editType: 'select',
        payload: {
          options: ['light', 'dark'],
        },
      },
      value: {
        name: '激活项',
        value: '',
        editType: 'menuMenuItemSingleSelect',
      },
      defaultValue: {
        name: '默认激活',
        value: '',
        editType: 'menuMenuItemSingleSelect',
      },
    },
    lifetimes: ['onChange', 'onExpand'],
  },
  {
    type: 'Menu',
    name: '侧边菜单',
    props: {
      collapsed: {
        name: '收起',
        value: false,
        editType: 'switch',
      },
      expandMutex: {
        name: '同级互斥展开',
        value: false,
        editType: 'switch',
      },
      expandType: {
        name: '展开方式',
        value: 'normal',
        editType: 'select',
        payload: {
          options: ['normal', 'popup'],
        },
      },
      expanded: {
        name: '展开项',
        value: [],
        editType: 'menuSubmenuMultiSelect',
      },
      defaultExpanded: {
        name: '默认展开项',
        value: [],
        editType: 'menuSubmenuMultiSelect',
      },
      theme: {
        name: '主题',
        value: 'light',
        editType: 'select',
        payload: {
          options: ['light', 'dark'],
        },
      },
      value: {
        name: '激活项',
        value: '',
        editType: 'menuMenuItemSingleSelect',
      },
      defaultValue: {
        name: '默认激活',
        value: '',
        editType: 'menuMenuItemSingleSelect',
      },
      width: {
        name: '宽度',
        value: '232px',
        editType: 'input',
      },
    },
    lifetimes: ['onChange', 'onExpand'],
  },
  {
    type: 'Menu.Submenu',
    name: '子菜单',
    props: {
      title: {
        name: '标题',
        value: '子菜单',
        editType: 'input',
      },
      content: {
        name: '内容',
        value: '',
        editType: 'input',
      },
      value: {
        name: '标识',
        value: '',
        editType: 'input',
      },
      iconName: {
        name: '图标',
        value: '',
        editType: 'iconSelect',
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch',
      },
    },
  },
  {
    type: 'Menu.Item',
    name: '菜单项',
    props: {
      content: {
        name: '内容',
        value: '菜单项',
        editType: 'input',
      },
      value: {
        name: '标识',
        value: '',
        editType: 'input',
      },
      iconName: {
        name: '图标',
        value: '',
        editType: 'iconSelect',
      },
      href: {
        name: '跳转地址',
        value: '',
        editType: 'input',
      },
      target: {
        name: '打开方式',
        value: '_self',
        editType: 'select',
        payload: {
          options: ['_self', '_blank', '_parent', '_top'],
        },
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch',
      },
    },
    lifetimes: ['onClick'],
  },
  {
    type: 'Menu.Group',
    name: '菜单分组',
    props: {
      title: {
        name: '分组标题',
        value: '分组标题',
        editType: 'input',
      },
    },
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
    type: 'Statistic',
    name: '统计数值',
    props: {
      title: {
        name: '标题',
        value: '本月销售额',
        editType: 'input',
      },
      value: {
        name: '数值',
        value: 26800,
        editType: 'inputNumber',
      },
      unit: {
        name: '单位',
        value: '元',
        editType: 'input',
      },
      decimalPlaces: {
        name: '小数位',
        value: 0,
        editType: 'inputNumber',
        payload: {
          min: 0,
          max: 8,
        },
      },
      separator: {
        name: '千分位分隔符',
        value: ',',
        editType: 'input',
      },
      color: {
        name: '主题色',
        value: 'blue',
        editType: 'select',
        payload: {
          options: ['black', 'blue', 'red', 'orange', 'green'],
        },
      },
      trend: {
        name: '趋势',
        value: '',
        editType: 'select',
        payload: {
          options: [
            { label: '无', value: '' },
            { label: '上升', value: 'increase' },
            { label: '下降', value: 'decrease' },
          ],
        },
      },
      trendPlacement: {
        name: '趋势图位置',
        value: 'left',
        editType: 'select',
        payload: {
          options: ['left', 'right'],
        },
      },
      loading: {
        name: '加载中',
        value: false,
        editType: 'switch',
      },
      animationStart: {
        name: '启用动效',
        value: false,
        editType: 'switch',
      },
    },
  },
  createChartComponent('EChart', '图表', 'line'),
  createChartComponent('LineChart', '折线图', 'line'),
  createChartComponent('BarChart', '柱状图', 'bar'),
  createChartComponent('PieChart', '饼图', 'pie'),
  createChartComponent('RadarChart', '雷达图', 'radar'),
  createChartComponent('ScatterChart', '散点图', 'scatter'),
  createChartComponent('AreaChart', '面积图', 'area'),
  createChartComponent('DonutChart', '环形图', 'donut'),
  createChartComponent('GaugeChart', '仪表盘', 'gauge'),
  createChartComponent('FunnelChart', '漏斗图', 'funnel'),
  createChartComponent('CandlestickChart', 'K线图', 'candlestick'),
  createChartComponent('TreemapChart', '矩形树图', 'treemap'),
  createChartComponent('HeatmapChart', '热力图', 'heatmap'),
  createChartComponent('SunburstChart', '旭日图', 'sunburst'),
  createChartComponent('MapChart', '地图', 'map'),
  createChartComponent('SankeyChart', '桑基图', 'sankey'),
  createChartComponent('GraphChart', '关系图', 'graph'),
  createChartComponent('BoxplotChart', '箱线图', 'boxplot'),
  createChartComponent('WaterfallChart', '瀑布图', 'waterfall'),
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
      },
      gallery: {
        name: '启用图片预览',
        value: false,
        editType: 'switch',
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
        name: '受控值',
        value: false,
        editType: 'switch'
      },
      defaultValue: {
        name: '非受控默认值',
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
        name: '高亮日期',
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
        name: '色值',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认色值',
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
        name: '时间值',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认时间',
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
        name: '步长',
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
        name: '范围值',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认范围',
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
        name: '步长',
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
    type: 'Input',
    name: '输入框',
    props: {
      className: {
        name: '类名',
        value: '',
        editType: 'input'
      },
      style: {
        name: '内联样式',
        value: '',
        editType: 'jsonCode'
      },
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      align: {
        name: '文本位置',
        value: 'left',
        editType: 'select',
        payload: {
          options: ['left', 'center', 'right']
        }
      },
      allowInputOverMax: {
        name: '超长继续输入',
        value: false,
        editType: 'switch'
      },
      autoWidth: {
        name: '宽度自适应',
        value: false,
        editType: 'switch'
      },
      autocomplete: {
        name: '自动填充',
        value: '',
        editType: 'input'
      },
      autofocus: {
        name: '自动聚焦',
        value: false,
        editType: 'switch'
      },
      borderless: {
        name: '无边框',
        value: false,
        editType: 'switch'
      },
      value: {
        name: '值',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认值',
        value: '',
        editType: 'input'
      },
      placeholder: {
        name: '占位文本',
        value: '请输入内容',
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
      readonly: {
        name: '只读',
        value: false,
        editType: 'switch'
      },
      maxcharacter: {
        name: '最大字符数',
        value: undefined,
        editType: 'inputNumber',
        payload: {
          min: 0
        }
      },
      maxlength: {
        name: '最大长度',
        value: undefined,
        editType: 'inputNumber',
        payload: {
          min: 0
        }
      },
      name: {
        name: '名称',
        value: '',
        editType: 'input'
      },
      showClearIconOnEmpty: {
        name: '空值也显示清空按钮',
        value: false,
        editType: 'switch'
      },
      showLimitNumber: {
        name: '显示字数统计',
        value: false,
        editType: 'switch'
      },
      spellCheck: {
        name: '拼写检查',
        value: false,
        editType: 'switch'
      },
      tips: {
        name: '提示文案',
        value: '',
        editType: 'input'
      },
      type: {
        name: '类型',
        value: 'text',
        editType: 'select',
        payload: {
          options: ['text', 'number', 'url', 'tel', 'password', 'search', 'submit', 'hidden']
        }
      }
    },
    lifetimes: [
      'onBlur',
      'onChange',
      'onClear',
      'onClick',
      'onCompositionend',
      'onCompositionstart',
      'onEnter',
      'onFocus',
      'onKeydown',
      'onKeypress',
      'onKeyup',
      'onMouseenter',
      'onMouseleave',
      'onPaste',
      'onValidate',
      'onWheel'
    ]
  },
  {
    type: 'Textarea',
    name: '多行文本框',
    props: {
      className: {
        name: '类名',
        value: '',
        editType: 'input'
      },
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      allowInputOverMax: {
        name: '超长继续输入',
        value: false,
        editType: 'switch'
      },
      autofocus: {
        name: '自动聚焦',
        value: false,
        editType: 'switch'
      },
      autosize: {
        name: '自动高度',
        value: false,
        editType: 'jsonCode'
      },
      count: {
        name: '计数器',
        value: false,
        editType: 'switch'
      },
      value: {
        name: '值',
        value: '',
        editType: 'input'
      },
      defaultValue: {
        name: '默认值',
        value: '',
        editType: 'input'
      },
      placeholder: {
        name: '占位文本',
        value: '请输入内容',
        editType: 'input'
      },
      status: {
        name: '状态',
        value: 'default',
        editType: 'select',
        payload: {
          options: ['default', 'success', 'warning', 'error']
        }
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
      readonly: {
        name: '只读兼容',
        value: false,
        editType: 'switch'
      },
      maxcharacter: {
        name: '最大字符数',
        value: undefined,
        editType: 'inputNumber',
        payload: {
          min: 0
        }
      },
      maxlength: {
        name: '最大长度',
        value: undefined,
        editType: 'inputNumber',
        payload: {
          min: 0
        }
      },
      name: {
        name: '名称',
        value: '',
        editType: 'input'
      },
      tips: {
        name: '提示文案',
        value: '',
        editType: 'input'
      }
    },
    lifetimes: ['onBlur', 'onChange', 'onFocus', 'onKeydown', 'onKeypress', 'onKeyup']
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
        name: '值',
        value: 0,
        editType: 'input'
      },
      defaultValue: {
        name: '默认值',
        value: 0,
        editType: 'input'
      },
      placeholder: {
        name: '占位文本',
        value: '',
        editType: 'input'
      },
      min: {
        name: '最小值',
        value: '',
        editType: 'input'
      },
      max: {
        name: '最大值',
        value: '',
        editType: 'input'
      },
      step: {
        name: '步长',
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
    type: 'Slider',
    name: '滑块',
    props: {
      controlled: {
        name: '受控模式',
        value: true,
        editType: 'switch'
      },
      value: {
        name: '值',
        value: '50',
        editType: 'input'
      },
      defaultValue: {
        name: '默认值',
        value: '50',
        editType: 'input'
      },
      layout: {
        name: '布局方向',
        value: 'horizontal',
        editType: 'select',
        payload: {
          options: ['horizontal', 'vertical']
        }
      },
      min: {
        name: '最小值',
        value: '0',
        editType: 'input'
      },
      max: {
        name: '最大值',
        value: '100',
        editType: 'input'
      },
      step: {
        name: '步长',
        value: '1',
        editType: 'input'
      },
      range: {
        name: '双游标',
        value: false,
        editType: 'switch'
      },
      disabled: {
        name: '禁用',
        value: false,
        editType: 'switch'
      }
    },
    lifetimes: ['onChange']
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
        name: '高度',
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

const visibleInjectedComponentCatalog = componentCatalog.map((item) => {
  const current = item as { props?: Record<string, unknown> };
  const props = current.props && typeof current.props === 'object'
    ? current.props
    : {};

  if ('visible' in props) {
    return item;
  }

  return {
    ...item,
    props: {
      ...props,
      visible: {
        name: '可见',
        value: true,
        editType: 'switch',
      },
    },
  };
});

export default visibleInjectedComponentCatalog;

import { List, Calendar, Steps, Tabs, Menu, Image, Button } from 'tdesign-react';
import type { ComponentRegistry } from '../componentContext';
import { ActivateWrapper, CardContent } from '../componentHelpers';
import DropArea from '../../../components/DropArea';
import { LIST_PREVIEW_DATA } from '../../../constants/componentBuilder';
import { getTabsPanelSlotKey, getTabsSlotNodeByValue } from '../../utils/tabs';

const { ListItem, ListItemMeta } = List;

export function registerDataComponents(registry: ComponentRegistry): void {
  registry.set('List', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, isNodeActive,
      getListFieldValue, applyListBindingToNode,
    } = ctx;
    const customTemplateEnabled = getBooleanProp('customTemplateEnabled') === true;
    const listItemTemplateNode = (data?.children ?? []).find((child) => child.type === 'List.Item');
    const getListItemTemplateProp = (propName: string) => {
      const prop = listItemTemplateNode?.props?.[propName] as { value?: unknown } | undefined;
      return prop?.value;
    };
    const titleField = getStringProp('titleField') || 'title';
    const descriptionField = getStringProp('descriptionField') || 'description';
    const imageField = getStringProp('imageField') || 'image';
    const actionField = getStringProp('actionField') || 'actionText';
    const showImage = getListItemTemplateProp('showImage') !== false;
    const showDescription = getListItemTemplateProp('showDescription') !== false;
    const showAction = getListItemTemplateProp('showAction') !== false;
    const actionTheme = String(getListItemTemplateProp('actionTheme') ?? 'default');
    const actionVariant = String(getListItemTemplateProp('actionVariant') ?? 'text');
    const actionSize = String(getListItemTemplateProp('actionSize') ?? 'small');

    const listProps = {
      layout: getStringProp('layout') as any,
      size: getStringProp('size') as any,
      split: getBooleanProp('split'),
      stripe: getBooleanProp('stripe'),
      header: getStringProp('header') || undefined,
      footer: getStringProp('footer') || undefined,
      asyncLoading: getStringProp('asyncLoading') || undefined,
      style: mergeStyle(),
    };

    if (customTemplateEnabled) {
      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
          <List {...listProps}>
            {LIST_PREVIEW_DATA.map((item, index) => {
              const boundTemplateNode = listItemTemplateNode
                ? {
                    ...listItemTemplateNode,
                    children: (listItemTemplateNode.children ?? []).map((child) => applyListBindingToNode(child, item)),
                  }
                : undefined;
              return (
                <ListItem key={`${data?.key ?? 'list'}-template-${index}`}>
                  <DropArea
                    data={boundTemplateNode}
                    onDropData={onDropData}
                    emptyText="拖拽组件到列表项模板"
                    compactWhenFilled
                  />
                </ListItem>
              );
            })}
          </List>
        </ActivateWrapper>
      );
    }

    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <List {...listProps}>
          {LIST_PREVIEW_DATA.map((item, index) => {
            const metaTitle = getListFieldValue(item, titleField);
            const metaDescription = getListFieldValue(item, descriptionField);
            const metaImage = getListFieldValue(item, imageField);
            const actionText = getListFieldValue(item, actionField);
            const resolvedTitle = metaTitle || `列表项 ${index + 1}`;
            const resolvedDescription = showDescription ? metaDescription : undefined;
            const resolvedImage = showImage ? metaImage : undefined;
            return (
              <ListItem
                key={`${data?.key ?? 'list'}-preview-${index}`}
                action={showAction && actionText ? (
                  <Button size={actionSize as any} variant={actionVariant as any} theme={actionTheme as any}>{actionText}</Button>
                ) : undefined}
              >
                <ListItemMeta
                  title={resolvedTitle}
                  description={resolvedDescription}
                  image={resolvedImage ? <Image src={resolvedImage} style={{ width: 56, height: 56, borderRadius: 6 }} /> : undefined}
                />
              </ListItem>
            );
          })}
        </List>
      </ActivateWrapper>
    );
  });

  registry.set('Card', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, isNodeActive,
      cardHeaderSlotNode, cardBodySlotNode, hasCardSlotStructure,
    } = ctx;
    const cardProps = {
      title: getStringProp('title'),
      subtitle: getStringProp('subtitle'),
      size: getStringProp('size'),
      bordered: getBooleanProp('bordered'),
      headerBordered: getBooleanProp('headerBordered'),
      shadow: getBooleanProp('shadow'),
      hoverShadow: getBooleanProp('hoverShadow'),
      style: mergeStyle(),
      onActivate: handleActivateSelf,
      nodeKey: data?.key,
      active: isNodeActive,
    };

    if (!hasCardSlotStructure) {
      return (
        <DropArea data={data} onDropData={onDropData}>
          <CardContent {...cardProps} />
        </DropArea>
      );
    }

    return (
      <CardContent
        {...cardProps}
        title={!cardHeaderSlotNode?.children?.length ? getStringProp('title') : undefined}
        subtitle={!cardHeaderSlotNode?.children?.length ? getStringProp('subtitle') : undefined}
        header={(
          <DropArea
            data={cardHeaderSlotNode}
            onDropData={onDropData}
            dropSlotKey="header"
            selectable={false}
            compactWhenFilled
            emptyText="拖拽组件到卡片头部"
          />
        )}
      >
        <DropArea
          data={cardBodySlotNode}
          onDropData={onDropData}
          dropSlotKey="body"
          selectable={false}
          compactWhenFilled
          emptyText="拖拽组件到卡片内容"
        />
      </CardContent>
    );
  });

  registry.set('Calendar', (ctx) => {
    const { getStringProp, getBooleanProp, getNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive, getCalendarValueProp } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Calendar
          theme={getStringProp('theme') as any}
          mode={getStringProp('mode') as any}
          firstDayOfWeek={getNumberProp('firstDayOfWeek')}
          format={getStringProp('format')}
          fillWithZero={getBooleanProp('fillWithZero')}
          isShowWeekendDefault={getBooleanProp('isShowWeekendDefault')}
          controllerConfig={getBooleanProp('controllerConfig')}
          preventCellContextmenu={getBooleanProp('preventCellContextmenu')}
          value={getCalendarValueProp('value') as any}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Steps', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, isNodeActive,
      getStepsCurrentProp,
    } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    const current = getStepsCurrentProp('current');
    const defaultCurrent = getStepsCurrentProp('defaultCurrent');
    const stepItems = (data?.children ?? [])
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
            ? (status as string)
            : undefined;
        const normalizedValue =
          typeof value === 'number' ? value
            : (typeof value === 'string' ? (value.trim() ? value.trim() : undefined) : undefined);
        return {
          key: child.key,
          title: typeof title === 'string' ? title : '',
          content: typeof content === 'string' ? content : '',
          status: normalizedStatus,
          value: normalizedValue,
        };
      });

    const stepsValueProps = isControlled
      ? { current: current ?? 0 }
      : { defaultCurrent: defaultCurrent ?? 0 };
    const stepsLayout = getStringProp('layout') as 'horizontal' | 'vertical' | undefined;
    const fallbackMinHeight = stepsLayout === 'vertical' ? 160 : 88;

    return (
      <DropArea data={data} onDropData={onDropData} emptyText="拖拽步骤项到步骤条" compactWhenFilled isTreeNode>
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
          <Steps
            {...stepsValueProps}
            layout={stepsLayout as any}
            readOnly={getBooleanProp('readOnly')}
            separator={getStringProp('separator') as any}
            sequence={getStringProp('sequence') as any}
            theme={getStringProp('theme') as any}
            onChange={() => { /* 搭建态仅展示 */ }}
            style={mergeStyle({ minHeight: fallbackMinHeight })}
          >
            {stepItems.map((item) => (
              <Steps.StepItem
                key={item.key}
                title={item.title}
                content={item.content}
                status={item.status as any}
                value={item.value as any}
              />
            ))}
          </Steps>
        </ActivateWrapper>
      </DropArea>
    );
  });

  // Steps.Item 由父 Steps 渲染，此处返回 null 防止重复渲染
  registry.set('Steps.Item', () => null);

  registry.set('Tabs', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, isNodeActive,
      getTabsListProp, getTabsControlledValue, getTabsDefaultValue,
      tabsInnerValue, setTabsInnerValue,
    } = ctx;
    const tabsList = getTabsListProp();
    const controlledValue = getTabsControlledValue();
    const defaultValue = getTabsDefaultValue();
    const firstValue = tabsList[0]?.value;
    const activeTabValue = controlledValue ?? tabsInnerValue ?? defaultValue ?? firstValue;

    const tabsPanels = tabsList.map((item) => {
      const slotNode = getTabsSlotNodeByValue(data, item.value);
      const slotKey = getTabsPanelSlotKey(item.value);
      return {
        value: item.value,
        label: item.label,
        disabled: item.disabled,
        draggable: item.draggable,
        removable: item.removable,
        lazy: item.lazy,
        destroyOnHide: item.destroyOnHide,
        panel: (
          <DropArea
            data={slotNode}
            onDropData={onDropData}
            dropSlotKey={slotKey}
            selectable={false}
            compactWhenFilled
            emptyText={`拖拽组件到「${item.label}」面板`}
          />
        ),
      };
    });

    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Tabs
          action={getStringProp('action') || undefined}
          addable={getBooleanProp('addable')}
          disabled={getBooleanProp('disabled')}
          dragSort={getBooleanProp('dragSort')}
          list={tabsPanels as any}
          placement={getStringProp('placement') as any}
          scrollPosition={getStringProp('scrollPosition') as any}
          size={getStringProp('size') as any}
          theme={getStringProp('theme') as any}
          value={activeTabValue as any}
          onChange={(value) => { setTabsInnerValue(value as string | number); }}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Menu', (ctx) => {
    const {
      getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getMenuValueProp, getMenuValueArrayProp, getMenuWidthProp, renderBuilderMenuNodes,
    } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Menu
          collapsed={getBooleanProp('collapsed')}
          expandMutex={getBooleanProp('expandMutex')}
          expandType={getStringProp('expandType') as any}
          expanded={getMenuValueArrayProp('expanded') as any}
          defaultExpanded={getMenuValueArrayProp('defaultExpanded') as any}
          theme={getStringProp('theme') as any}
          value={getMenuValueProp('value') as any}
          defaultValue={getMenuValueProp('defaultValue') as any}
          width={getMenuWidthProp('width') as any}
          style={mergeStyle()}
          onChange={() => { /* 搭建态仅展示 */ }}
          onExpand={() => { /* 搭建态仅展示 */ }}
        >
          {renderBuilderMenuNodes(data?.children)}
        </Menu>
      </ActivateWrapper>
    );
  });

  registry.set('HeadMenu', (ctx) => {
    const {
      getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getMenuValueProp, getMenuValueArrayProp, renderBuilderMenuNodes,
    } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Menu.HeadMenu
          expandType={getStringProp('expandType') as any}
          expanded={getMenuValueArrayProp('expanded') as any}
          defaultExpanded={getMenuValueArrayProp('defaultExpanded') as any}
          theme={getStringProp('theme') as any}
          value={getMenuValueProp('value') as any}
          defaultValue={getMenuValueProp('defaultValue') as any}
          style={mergeStyle()}
          onChange={() => { /* 搭建态仅展示 */ }}
          onExpand={() => { /* 搭建态仅展示 */ }}
        >
          {renderBuilderMenuNodes(data?.children)}
        </Menu.HeadMenu>
      </ActivateWrapper>
    );
  });

  // 菜单子项由父组件的 renderBuilderMenuNodes 处理，独立渲染返回 null
  registry.set('Menu.Submenu', () => null);
  registry.set('Menu.Item', () => null);
  registry.set('Menu.Group', () => null);
}

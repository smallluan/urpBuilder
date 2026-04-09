import { Upload, Drawer, Popup } from 'tdesign-react';
import type { ComponentRegistry } from '../componentContext';
import { ActivateWrapper } from '../componentHelpers';
import DropArea from '../../../components/DropArea';
import { getNodeSlotKey, isSlotNode } from '../../utils/slot';

export function registerFeedbackComponents(registry: ComponentRegistry): void {
  registry.set('Upload', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle,
      handleActivateSelf, isNodeActive,
      getUploadAbridgeNameProp, getUploadFileListProp, getUploadObjectProp,
      getUploadSizeLimitProp, getUploadStatusProp,
    } = ctx;
    const hasTriggerChildren = (data?.children?.length ?? 0) > 0;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Upload
          className={getStringProp('className') || undefined}
          abridgeName={getUploadAbridgeNameProp('abridgeName') as any}
          accept={getStringProp('accept') || undefined}
          action={getStringProp('action') || undefined}
          allowUploadDuplicateFile={getBooleanProp('allowUploadDuplicateFile')}
          autoUpload={getBooleanProp('autoUpload') !== false}
          data={getUploadObjectProp('data') as any}
          disabled={getBooleanProp('disabled')}
          draggable={getBooleanProp('draggable')}
          files={getUploadFileListProp('files') as any}
          defaultFiles={getUploadFileListProp('defaultFiles') as any}
          headers={getUploadObjectProp('headers') as any}
          max={getFiniteNumberProp('max')}
          method={getStringProp('method') as any}
          mockProgressDuration={getFiniteNumberProp('mockProgressDuration')}
          multiple={getBooleanProp('multiple')}
          name={getStringProp('name') || undefined}
          placeholder={getStringProp('placeholder') || undefined}
          showImageFileName={getBooleanProp('showImageFileName')}
          showThumbnail={getBooleanProp('showThumbnail')}
          showUploadProgress={getBooleanProp('showUploadProgress')}
          sizeLimit={getUploadSizeLimitProp('sizeLimit') as any}
          status={getUploadStatusProp('status') as any}
          theme={getStringProp('theme') as any}
          tips={getStringProp('tips') || undefined}
          uploadAllFilesInOneRequest={getBooleanProp('uploadAllFilesInOneRequest')}
          uploadPastedFiles={getBooleanProp('uploadPastedFiles')}
          useMockProgress={getBooleanProp('useMockProgress')}
          withCredentials={getBooleanProp('withCredentials')}
          style={mergeStyle()}
        >
          <DropArea
            data={data}
            onDropData={onDropData}
            emptyText="拖拽组件到上传触发区"
            compactWhenFilled={hasTriggerChildren}
          />
        </Upload>
      </ActivateWrapper>
    );
  });

  registry.set('Drawer', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, getNumberProp, mergeStyle,
      handleActivateSelf, isSubtreeActive,
      getBuilderDrawerAttach, getDrawerHeaderProp, getDrawerFooterProp, getDrawerSizeDraggableProp,
    } = ctx;
    const hasDrawerChildren = (data?.children?.length ?? 0) > 0;
    const drawerBodyText = getStringProp('body')?.trim();
    const drawerVisible = getBooleanProp('visible') === true && isSubtreeActive;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isSubtreeActive}>
        <div style={{ position: 'relative' }}>
          <Drawer
            className={getStringProp('className') || undefined}
            attach={getBuilderDrawerAttach() as any}
            body={!hasDrawerChildren ? (drawerBodyText || undefined) : undefined}
            cancelBtn={getStringProp('cancelBtn') || undefined}
            closeBtn={getBooleanProp('closeBtn') !== false}
            closeOnEscKeydown={getBooleanProp('closeOnEscKeydown') !== false}
            closeOnOverlayClick={getBooleanProp('closeOnOverlayClick') !== false}
            confirmBtn={getStringProp('confirmBtn') || undefined}
            destroyOnClose={getBooleanProp('destroyOnClose') === true}
            footer={getDrawerFooterProp()}
            header={getDrawerHeaderProp() as any}
            lazy={getBooleanProp('lazy') !== false}
            placement={getStringProp('placement') as any}
            preventScrollThrough={getBooleanProp('preventScrollThrough') !== false}
            showOverlay={getBooleanProp('showOverlay') !== false}
            size={getStringProp('size') || undefined}
            sizeDraggable={getDrawerSizeDraggableProp() as any}
            visible={drawerVisible}
            zIndex={getNumberProp('zIndex')}
            style={mergeStyle()}
            onClose={() => { /* 搭建态仅展示 */ }}
            onConfirm={() => { /* 搭建态仅展示 */ }}
            onCancel={() => { /* 搭建态仅展示 */ }}
          >
            <DropArea
              data={data}
              onDropData={onDropData}
              emptyText="拖拽组件到抽屉内容"
              compactWhenFilled
            />
          </Drawer>
        </div>
      </ActivateWrapper>
    );
  });

  registry.set('Popup', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, getNumberProp, mergeStyle,
      handleActivateSelf, isNodeActive, getBuilderDrawerAttach,
    } = ctx;
    const slotNodes = (data?.children ?? []).filter((child) => isSlotNode(child));
    const triggerSlotNode = slotNodes.find((child) => getNodeSlotKey(child) === 'trigger');
    const contentSlotNode = slotNodes.find((child) => getNodeSlotKey(child) === 'content');
    const popupVisible = ((contentSlotNode?.props?.visible as { value?: unknown } | undefined)?.value) === true;
    const contentNode = contentSlotNode ? (
      <DropArea
        data={contentSlotNode}
        onDropData={onDropData}
        dropSlotKey="content"
        emptyText="拖拽组件到浮层内容"
        compactWhenFilled
      />
    ) : null;

    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Popup
          attach={getBuilderDrawerAttach() as any}
          trigger={getStringProp('trigger') as any}
          placement={getStringProp('placement') as any}
          showArrow={getBooleanProp('showArrow') !== false}
          destroyOnClose={getBooleanProp('destroyOnClose') === true}
          disabled={getBooleanProp('disabled') === true}
          visible={popupVisible}
          zIndex={getNumberProp('zIndex')}
          hideEmptyPopup={getBooleanProp('hideEmptyPopup') !== false}
          overlayClassName={getStringProp('overlayClassName') || undefined}
          overlayInnerClassName={getStringProp('overlayInnerClassName') || undefined}
          delay={getNumberProp('delay') ?? undefined}
          content={contentNode}
          onVisibleChange={() => { /* 搭建态由 content 节点激活状态控制 */ }}
        >
          {triggerSlotNode ? (
            <DropArea
              data={triggerSlotNode}
              onDropData={onDropData}
              dropSlotKey="trigger"
              emptyText="拖拽组件到触发器"
              compactWhenFilled
            />
          ) : (
            <span />
          )}
        </Popup>
      </ActivateWrapper>
    );
  });
}

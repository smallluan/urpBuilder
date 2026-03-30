/**
 * 保存 / 保存并发布前的「是否有可持久化变更」判断（编辑已有资源时）。
 * 新建资源始终允许进入保存流程。
 */

export type AssertPersistableChangesParams = {
  /** 是否为编辑已有模板（存在 currentPageId） */
  isEditingExisting: boolean;
  /**
   * 与 load/上次保存后基线相比，撤销栈是否离开过初始位置。
   * 仅在「持久化指纹基线尚未写入」时参与判断（详情加载完成前避免误拦）。
   */
  historyPointer: number;
  /** 当前画布按保存口径计算的内容指纹 */
  currentTemplateFingerprint: string;
  /** 详情加载成功或上次保存成功后写入的指纹；空字符串表示基线未就绪 */
  lastPersistedTemplateFingerprint: string;
  /** 保存弹窗内填写的名称 */
  formPageName: string;
  /** 保存弹窗内填写的描述 */
  formDescription: string;
  /** 当前 store 中的名称 */
  storedPageName: string;
  /** 当前 store 中的描述 */
  storedDescription: string;
};

/**
 * @returns 若不应提交（编辑态且画布/元数据均无变更），返回提示文案；否则 null
 */
export function getBlockMessageWhenNoPersistableChanges(params: AssertPersistableChangesParams): string | null {
  if (!params.isEditingExisting) {
    return null;
  }

  const metaDirty =
    params.formPageName.trim() !== (params.storedPageName || '').trim()
    || params.formDescription.trim() !== (params.storedDescription || '').trim();

  const baselineReady = params.lastPersistedTemplateFingerprint !== '';
  const contentDirty = baselineReady
    ? params.currentTemplateFingerprint !== params.lastPersistedTemplateFingerprint
    : params.historyPointer !== -1;

  if (!contentDirty && !metaDirty) {
    return '当前没有未保存的修改，无需提交';
  }

  return null;
}

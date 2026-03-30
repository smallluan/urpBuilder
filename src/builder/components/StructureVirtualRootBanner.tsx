import React from 'react';
import { CloseIcon } from 'tdesign-icons-react';

type Props = {
  visible: boolean;
  /** 当前作为展示根的节点标题 */
  rootLabel: string;
  onClear: () => void;
};

const StructureVirtualRootBanner: React.FC<Props> = ({ visible, rootLabel, onClear }) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="structure-virtual-root-banner" role="status">
      <span className="structure-virtual-root-banner__text">
        以根节点展示：<strong className="structure-virtual-root-banner__name">{rootLabel}</strong>
      </span>
      <button
        type="button"
        className="structure-virtual-root-banner__close"
        aria-label="恢复完整结构树"
        onClick={onClear}
      >
        <CloseIcon size="14px" />
      </button>
    </div>
  );
};

export default React.memo(StructureVirtualRootBanner);

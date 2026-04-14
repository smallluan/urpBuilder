import { Link } from 'react-router-dom';
import { docPath } from './nav';

export default function DocsWelcomePage() {
  return (
    <div className="doc-article">
      <h1>帮助中心</h1>
      <p className="doc-lead">
        BuilderNext 帮助文档（渐进式完善中）。请从左侧目录进入各章节；正文将随版本持续补充。
      </p>
      <p>
        建议从 <Link to={docPath('intro', 'overview')}>产品能做什么</Link> 开始。
      </p>
    </div>
  );
}

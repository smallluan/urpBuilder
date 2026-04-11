import React from 'react';
import { CHANGELOG_ENTRIES } from './changelogData';
import '../../styles/app-shell-page.less';
import './style.less';

const ChangelogPage: React.FC = () => {
  return (
    <div className="app-shell-page changelog-page">
      <div className="changelog-page__header">
        <h1 className="changelog-page__title">更新日志</h1>
        <p className="changelog-page__lead">
          记录各阶段重大能力节点。列表按时间倒序排列，最新版本在上方。
        </p>
      </div>

      <div className="changelog-timeline" role="list">
        {CHANGELOG_ENTRIES.map((entry, index) => {
          const side = index % 2 === 0 ? 'left' : 'right';
          return (
            <div
              key={entry.version}
              className={`changelog-timeline__row changelog-timeline__row--${side}`}
              role="listitem"
            >
              <span className="changelog-timeline__node" aria-hidden />
              <article className="changelog-timeline__card">
                <div className="changelog-timeline__meta">
                  <span className="changelog-timeline__version">{entry.version}</span>
                  <span className="changelog-timeline__date">{entry.date}</span>
                </div>
                <h2 className="changelog-timeline__heading">{entry.title}</h2>
                <ul className="changelog-timeline__list">
                  {entry.highlights.map((line, i) => (
                    <li key={`${entry.version}-${i}`}>{line}</li>
                  ))}
                </ul>
              </article>
            </div>
          );
        })}
      </div>

      <p className="changelog-page__footnote">
        条目由仓库提交历史归纳整理；发版或里程碑达成时请在源码中更新{' '}
        <code style={{ fontSize: '12px' }}>changelogData.ts</code> 以保持同步。
      </p>
    </div>
  );
};

export default ChangelogPage;

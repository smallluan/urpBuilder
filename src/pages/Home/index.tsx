import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudIcon, CodeIcon, FileIcon, ImageIcon, SettingIcon } from 'tdesign-icons-react';
import '../../styles/app-shell-page.less';
import './style.less';

type EntryCard = {
  id: string;
  title: string;
  desc: string;
  path: string;
  icon: React.ReactNode;
};

/** 与侧栏一致（不含未开放的 API 管理、不含团队空间快捷入口） */
const ENTRIES: EntryCard[] = [
  {
    id: 'build-component',
    title: '构建组件',
    desc: '从物料库拖拽搭建业务组件，配置属性与插槽并发布为可复用资产。',
    path: '/build-component',
    icon: <CodeIcon size="22" />,
  },
  {
    id: 'build-page',
    title: '构建页面',
    desc: '编排页面结构、路由与数据绑定，对接预览与发布流程。',
    path: '/build-page',
    icon: <FileIcon size="22" />,
  },
  {
    id: 'data-constance',
    title: '常量管理',
    desc: '维护键值型常量，供页面、组件与流程在运行时读取。',
    path: '/data-constance',
    icon: <SettingIcon size="22" />,
  },
  {
    id: 'data-cloud-function',
    title: '云函数',
    desc: '编写与部署云端逻辑，为搭建应用提供可编排的后端能力。',
    path: '/data-cloud-function',
    icon: <CloudIcon size="22" />,
  },
  {
    id: 'data-assets',
    title: '素材管理',
    desc: '上传与管理图片等素材资源，在搭建器中引用与预览。',
    path: '/data-assets',
    icon: <ImageIcon size="22" />,
  },
];

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-page__backdrop" aria-hidden>
        <div className="home-page__mesh" />
        <div className="home-page__glow home-page__glow--a" />
        <div className="home-page__glow home-page__glow--b" />
      </div>

      <div className="home-page__shell app-shell-page">
        <header className="home-page__hero">
          <div className="home-page__eyebrow">URP BUILDER</div>
          <h1 className="home-page__title app-shell-page__title">欢迎来到工作台</h1>
          <p className="home-page__lead app-shell-page__lead">
            低代码搭建与资产治理的统一入口。从侧栏进入各模块，或使用下方快捷入口开始。
          </p>
        </header>

        <section className="home-page__grid" aria-label="快捷入口">
          {ENTRIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="home-page__card"
              onClick={() => navigate(item.path)}
            >
              <span className="home-page__card-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="home-page__card-title">{item.title}</span>
              <span className="home-page__card-desc">{item.desc}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
};

export default Home;

import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="home-page app-shell-page app-shell-page--centered">
      <h1 className="app-shell-page__title">欢迎来到 URP Builder</h1>
      <p className="app-shell-page__lead">这是应用主页，可从侧栏进入构建、数据与团队等功能模块。</p>
    </div>
  );
};

export default Home;
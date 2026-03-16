import React, { useState } from 'react';
import { Button, Input } from 'tdesign-react';
import { LockOnIcon, UserIcon } from 'tdesign-icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context';
import './style.less';

interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, authenticating } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      return;
    }

    try {
      await login({
        username: username.trim(),
        password,
      });

      const nextPath = (location.state as LoginLocationState | null)?.from?.pathname || '/build-page';
      navigate(nextPath, { replace: true });
    } catch {
      // 全局提示由 request 拦截器统一处理
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__panel">
        <div className="login-page__brand">
          <img src="/urpBuilder.png" alt="URP Builder" className="login-page__logo" />
          <div>
            <h1>登录 URP Builder</h1>
            <p>进入你的页面、组件和后续发布能力。</p>
          </div>
        </div>

        <div className="login-page__form">
          <Input
            size="large"
            value={username}
            onChange={(value) => setUsername(String(value))}
            placeholder="用户名"
            prefixIcon={<UserIcon />}
            clearable
            onEnter={handleSubmit}
          />
          <Input
            size="large"
            type="password"
            value={password}
            onChange={(value) => setPassword(String(value))}
            placeholder="密码"
            prefixIcon={<LockOnIcon />}
            onEnter={handleSubmit}
          />
          <Button theme="primary" size="large" block loading={authenticating} onClick={handleSubmit}>
            登录
          </Button>
          <Button variant="text" theme="default" onClick={() => navigate('/register')}>
            没有账号？去注册
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
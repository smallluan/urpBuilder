import React, { useState } from 'react';
import { Button, Input } from 'tdesign-react';
import { LockOnIcon, UserIcon } from 'tdesign-icons-react';
import { useNavigate } from 'react-router-dom';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import '../Login/style.less';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, authenticating } = useAuth();
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    if (!username.trim() || !password || !confirmPassword) {
      emitApiAlert('注册失败', '请填写完整注册信息');
      return;
    }

    if (password !== confirmPassword) {
      emitApiAlert('注册失败', '两次输入的密码不一致');
      return;
    }

    try {
      await register({
        username: username.trim(),
        password,
        nickname: nickname.trim() || undefined,
      });

      navigate('/build-page', { replace: true });
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
            <h1>注册 URP Builder</h1>
            <p>创建你的账号，开始管理页面、组件和发布资产。</p>
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
            value={nickname}
            onChange={(value) => setNickname(String(value))}
            placeholder="昵称（可选）"
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
          <Input
            size="large"
            type="password"
            value={confirmPassword}
            onChange={(value) => setConfirmPassword(String(value))}
            placeholder="确认密码"
            prefixIcon={<LockOnIcon />}
            onEnter={handleSubmit}
          />
          <Button theme="primary" size="large" block loading={authenticating} onClick={handleSubmit}>
            注册并进入平台
          </Button>
          <Button variant="text" theme="default" onClick={() => navigate('/login')}>
            已有账号，去登录
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Register;
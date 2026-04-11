import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input } from 'tdesign-react';
import { LockOnIcon, UserIcon } from 'tdesign-icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import AuthPortalHero from './AuthPortalHero';
import './style.less';

interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}

type AuthMode = 'login' | 'register';
type PanelPhase = 'steady' | 'flip-out' | 'flip-in';

const heroStories = [
  {
    title: '拖拽搭建、流程编排与发布交付同屏协同',
    desc: '围绕低代码平台的组件资产、流程节点和运行配置，形成从搭建到上线的一体化工作流。',
    badge: 'LOW-CODE STUDIO',
    metaA: '页面 + 流程一体化',
    metaB: '交付链路可复用',
  },
  {
    title: '组件、模板、数据源统一沉淀为可复用资产',
    desc: '设计物料、业务组件、接口配置与页面模版统一治理，降低多人协作时的信息损耗。',
    badge: 'ASSET GOVERNANCE',
    metaA: '资产版本可追踪',
    metaB: '团队协作更稳定',
  },
  {
    title: '面向企业后台与业务系统的高效搭建入口',
    desc: '从账号进入工作台后即可接入页面搭建、代码工作台和运维配置，快速进入真实业务场景。',
    badge: 'ENTERPRISE BUILDER',
    metaA: '低代码生产力',
    metaB: '企业级扩展能力',
  },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, authenticating } = useAuth();
  const routeMode: AuthMode = location.pathname === '/register' ? 'register' : 'login';
  const [visibleMode, setVisibleMode] = useState<AuthMode>(routeMode);
  const [panelPhase, setPanelPhase] = useState<PanelPhase>('steady');
  const timersRef = useRef<number[]>([]);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerNickname, setRegisterNickname] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  useEffect(() => {
    if (routeMode === visibleMode) {
      return;
    }

    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    setPanelPhase('flip-out');

    const swapTimer = window.setTimeout(() => {
      setVisibleMode(routeMode);
      setPanelPhase('flip-in');
    }, 190);

    const settleTimer = window.setTimeout(() => {
      setPanelPhase('steady');
    }, 470);

    timersRef.current = [swapTimer, settleTimer];

    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [routeMode, visibleMode]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const panelMeta = useMemo(() => {
    if (visibleMode === 'register') {
      return {
        modeLabel: 'NEW WORKSPACE ACCESS',
        title: '注册账号',
        desc: '创建你的企业低代码协作工作台',
        primaryText: '注册并进入平台',
        toggleText: '已有账号，去登录',
        toggleMode: 'login' as AuthMode,
      };
    }

    return {
      modeLabel: 'WORKSPACE SIGN IN',
      title: '欢迎登录',
      desc: '使用账号密码进入低代码工作台',
      primaryText: '登录',
      toggleText: '没有账号？去注册',
      toggleMode: 'register' as AuthMode,
    };
  }, [visibleMode]);

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === routeMode) {
      return;
    }

    navigate(nextMode === 'login' ? '/login' : '/register', {
      replace: true,
      state: location.state,
    });
  };

  const handleLoginSubmit = async () => {
    if (!loginUsername.trim() || !loginPassword) {
      return;
    }

    try {
      await login({
        username: loginUsername.trim(),
        password: loginPassword,
      });

      const nextPath = (location.state as LoginLocationState | null)?.from?.pathname || '/';
      navigate(nextPath, { replace: true });
    } catch {
      // 全局提示由 request 拦截器统一处理
    }
  };

  const handleRegisterSubmit = async () => {
    if (!registerUsername.trim() || !registerPassword || !registerConfirmPassword) {
      emitApiAlert('注册失败', '请填写完整注册信息');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      emitApiAlert('注册失败', '两次输入的密码不一致');
      return;
    }

    try {
      await register({
        username: registerUsername.trim(),
        password: registerPassword,
        nickname: registerNickname.trim() || undefined,
      });

      navigate('/', { replace: true });
    } catch {
      // 全局提示由 request 拦截器统一处理
    }
  };

  return (
    <div className="login-page">
      <AuthPortalHero eyebrow="URP-BUILDER" stories={heroStories} />
      <div className="login-page__mask" />
      <div className="login-page__panel-wrap">
        <div className="login-page__panel-stage">
          <div className={`login-page__panel login-page__panel--${panelPhase}`}>
            <div className="login-page__header">
              <div className="login-page__mode-label">{panelMeta.modeLabel}</div>
              <div className="login-page__header-main">
                <div>
                  <h1>{panelMeta.title}</h1>
                  <p>{panelMeta.desc}</p>
                </div>
              </div>
            </div>
            {visibleMode === 'login' ? (
              <div className="login-page__form">
                <Input
                  size="large"
                  value={loginUsername}
                  onChange={(value) => setLoginUsername(String(value))}
                  placeholder="用户名"
                  prefixIcon={<UserIcon />}
                  clearable
                  onEnter={handleLoginSubmit}
                />
                <Input
                  size="large"
                  type="password"
                  value={loginPassword}
                  onChange={(value) => setLoginPassword(String(value))}
                  placeholder="密码"
                  prefixIcon={<LockOnIcon />}
                  onEnter={handleLoginSubmit}
                />
                <div className="login-page__reserve">
                  <div className="login-page__reserve-title">扩展位（后续支持手机号登录）</div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="手机号（预留）" disabled />
                  </div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="验证码（预留）" disabled />
                    <Button size="large" variant="outline" disabled>
                      发送验证码
                    </Button>
                  </div>
                </div>
                <Button theme="primary" size="large" block loading={authenticating} onClick={handleLoginSubmit}>
                  {panelMeta.primaryText}
                </Button>
                <Button variant="text" theme="default" onClick={() => switchMode(panelMeta.toggleMode)}>
                  {panelMeta.toggleText}
                </Button>
              </div>
            ) : (
              <div className="login-page__form">
                <Input
                  size="large"
                  value={registerUsername}
                  onChange={(value) => setRegisterUsername(String(value))}
                  placeholder="用户名"
                  prefixIcon={<UserIcon />}
                  clearable
                  onEnter={handleRegisterSubmit}
                />
                <Input
                  size="large"
                  value={registerNickname}
                  onChange={(value) => setRegisterNickname(String(value))}
                  placeholder="昵称（可选）"
                  clearable
                  onEnter={handleRegisterSubmit}
                />
                <Input
                  size="large"
                  type="password"
                  value={registerPassword}
                  onChange={(value) => setRegisterPassword(String(value))}
                  placeholder="密码"
                  prefixIcon={<LockOnIcon />}
                  onEnter={handleRegisterSubmit}
                />
                <Input
                  size="large"
                  type="password"
                  value={registerConfirmPassword}
                  onChange={(value) => setRegisterConfirmPassword(String(value))}
                  placeholder="确认密码"
                  prefixIcon={<LockOnIcon />}
                  onEnter={handleRegisterSubmit}
                />
                <div className="login-page__reserve">
                  <div className="login-page__reserve-title">扩展位（后续支持手机号注册）</div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="手机号（预留）" disabled />
                  </div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="验证码（预留）" disabled />
                    <Button size="large" variant="outline" disabled>
                      发送验证码
                    </Button>
                  </div>
                </div>
                <Button theme="primary" size="large" block loading={authenticating} onClick={handleRegisterSubmit}>
                  {panelMeta.primaryText}
                </Button>
                <Button variant="text" theme="default" onClick={() => switchMode(panelMeta.toggleMode)}>
                  {panelMeta.toggleText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
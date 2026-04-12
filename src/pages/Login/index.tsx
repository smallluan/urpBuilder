import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import { Button, Input } from 'tdesign-react';
import { LockOnIcon, UserIcon } from 'tdesign-icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ApiResponse } from '../../api/types';
import { emitApiAlert } from '../../api/alertBus';
import { fetchAuthCaptcha } from '../../auth/api';
import { useAuth } from '../../auth/context';
import AuthPortalHero from './AuthPortalHero';
import './style.less';
import { validateNickname, validatePasswordStrength, validateUsername } from './validation';

interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}

type AuthMode = 'login' | 'register';
type PanelPhase = 'steady' | 'flip-out' | 'flip-in';

const svgCaptchaToDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

type FieldErrors<T extends string> = Partial<Record<T, string>>;

type LoadCaptchaOptions = {
  /** 为 false 时刷新图片后仍保留验证码输入框上的错误 tips（如服务端 400011） */
  clearCaptchaFieldError?: boolean;
};

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
  const [loginCaptchaId, setLoginCaptchaId] = useState('');
  const [loginCaptchaSvg, setLoginCaptchaSvg] = useState('');
  const [loginCaptchaCode, setLoginCaptchaCode] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerNickname, setRegisterNickname] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerCaptchaId, setRegisterCaptchaId] = useState('');
  const [registerCaptchaSvg, setRegisterCaptchaSvg] = useState('');
  const [registerCaptchaCode, setRegisterCaptchaCode] = useState('');

  const [loginFieldErrors, setLoginFieldErrors] = useState<FieldErrors<'username' | 'password' | 'captcha'>>({});
  const [registerFieldErrors, setRegisterFieldErrors] = useState<
    FieldErrors<'username' | 'nickname' | 'password' | 'confirm' | 'captcha'>
  >({});

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

  const loadLoginCaptcha = useCallback(async (options?: LoadCaptchaOptions) => {
    const clearCaptchaFieldError = options?.clearCaptchaFieldError !== false;
    try {
      const { captchaId, image } = await fetchAuthCaptcha();
      setLoginCaptchaId(captchaId);
      setLoginCaptchaSvg(image);
      setLoginCaptchaCode('');
      if (clearCaptchaFieldError) {
        setLoginFieldErrors((prev) => ({ ...prev, captcha: undefined }));
      }
    } catch {
      setLoginCaptchaId('');
      setLoginCaptchaSvg('');
    }
  }, []);

  const loadRegisterCaptcha = useCallback(async (options?: LoadCaptchaOptions) => {
    const clearCaptchaFieldError = options?.clearCaptchaFieldError !== false;
    try {
      const { captchaId, image } = await fetchAuthCaptcha();
      setRegisterCaptchaId(captchaId);
      setRegisterCaptchaSvg(image);
      setRegisterCaptchaCode('');
      if (clearCaptchaFieldError) {
        setRegisterFieldErrors((prev) => ({ ...prev, captcha: undefined }));
      }
    } catch {
      setRegisterCaptchaId('');
      setRegisterCaptchaSvg('');
    }
  }, []);

  /** 切换登录/注册面板后，清空已隐藏一侧的表单，避免再切回来仍保留旧输入 */
  useEffect(() => {
    if (visibleMode === 'login') {
      setRegisterUsername('');
      setRegisterNickname('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterCaptchaId('');
      setRegisterCaptchaSvg('');
      setRegisterCaptchaCode('');
      setRegisterFieldErrors({});
      void loadLoginCaptcha();
    } else {
      setLoginUsername('');
      setLoginPassword('');
      setLoginCaptchaId('');
      setLoginCaptchaSvg('');
      setLoginCaptchaCode('');
      setLoginFieldErrors({});
      void loadRegisterCaptcha();
    }
  }, [visibleMode, loadLoginCaptcha, loadRegisterCaptcha]);

  const panelMeta = useMemo(() => {
    if (visibleMode === 'register') {
    return {
      modeLabel: 'NEW WORKSPACE ACCESS',
      title: '注册账号',
      primaryText: '注册并进入平台',
      toggleText: '已有账号，去登录',
      toggleMode: 'login' as AuthMode,
    };
    }

    return {
      modeLabel: 'WORKSPACE SIGN IN',
      title: '欢迎登录',
      desc: '请使用注册时的登录账号与密码进入工作台。',
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
    const nextErrors: FieldErrors<'username' | 'password' | 'captcha'> = {};
    const uErr = validateUsername(loginUsername);
    if (uErr) nextErrors.username = uErr;
    if (!loginPassword) nextErrors.password = '请输入密码';
    if (!loginCaptchaId || !loginCaptchaCode.trim()) {
      nextErrors.captcha = '请填写图形验证码';
    }
    if (Object.keys(nextErrors).length > 0) {
      setLoginFieldErrors(nextErrors);
      return;
    }
    setLoginFieldErrors({});

    try {
      await login({
        username: loginUsername.trim(),
        password: loginPassword,
        captchaId: loginCaptchaId,
        captchaCode: loginCaptchaCode.trim(),
      });

      const nextPath = (location.state as LoginLocationState | null)?.from?.pathname || '/';
      navigate(nextPath, { replace: true });
    } catch (e) {
      const ax = e as AxiosError<ApiResponse<unknown>>;
      const code = ax.response?.data?.code;
      const msg = ax.response?.data?.message ?? '';
      if (code === 400011) {
        void loadLoginCaptcha({ clearCaptchaFieldError: false });
        setLoginFieldErrors({ captcha: msg || '图形验证码错误或已失效，请重新获取' });
        return;
      }
      if (code === 401001 || ax.response?.status === 401) {
        void loadLoginCaptcha();
        setLoginFieldErrors({
          password: msg || '登录账号或密码错误',
        });
        return;
      }
      void loadLoginCaptcha();
      emitApiAlert('登录失败', msg || '请稍后重试');
    }
  };

  const handleRegisterSubmit = async () => {
    const nextErrors: FieldErrors<'username' | 'nickname' | 'password' | 'confirm' | 'captcha'> = {};
    const uErr = validateUsername(registerUsername);
    if (uErr) nextErrors.username = uErr;
    const nErr = validateNickname(registerNickname);
    if (nErr) nextErrors.nickname = nErr;
    const pErr = validatePasswordStrength(registerPassword);
    if (pErr) nextErrors.password = pErr;
    if (!registerConfirmPassword) {
      nextErrors.confirm = '请再次输入密码';
    } else if (!pErr && registerPassword !== registerConfirmPassword) {
      nextErrors.confirm = '两次输入的密码不一致';
    }
    if (!registerCaptchaId || !registerCaptchaCode.trim()) {
      nextErrors.captcha = '请填写图形验证码';
    }
    if (Object.keys(nextErrors).length > 0) {
      setRegisterFieldErrors(nextErrors);
      return;
    }
    setRegisterFieldErrors({});

    try {
      await register({
        username: registerUsername.trim(),
        password: registerPassword,
        captchaId: registerCaptchaId,
        captchaCode: registerCaptchaCode.trim(),
        nickname: registerNickname.trim() || undefined,
      });

      navigate('/', { replace: true });
    } catch (e) {
      const ax = e as AxiosError<ApiResponse<unknown>>;
      const code = ax.response?.data?.code;
      const msg = ax.response?.data?.message ?? '';
      const status = ax.response?.status;
      if (code === 400011) {
        void loadRegisterCaptcha({ clearCaptchaFieldError: false });
        setRegisterFieldErrors({ captcha: msg || '图形验证码错误或已失效，请重新获取' });
        return;
      }
      if (code === 1004 || status === 409) {
        void loadRegisterCaptcha();
        setRegisterFieldErrors({ username: msg || '该登录账号已被注册' });
        return;
      }
      void loadRegisterCaptcha();
      emitApiAlert('注册失败', msg || '请稍后重试');
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
                  onChange={(value) => {
                    setLoginUsername(String(value));
                    setLoginFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  placeholder="登录账号"
                  prefixIcon={<UserIcon />}
                  clearable
                  onEnter={handleLoginSubmit}
                  status={loginFieldErrors.username ? 'error' : undefined}
                  tips={loginFieldErrors.username}
                />
                <Input
                  size="large"
                  type="password"
                  value={loginPassword}
                  onChange={(value) => {
                    setLoginPassword(String(value));
                    setLoginFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="密码"
                  prefixIcon={<LockOnIcon />}
                  onEnter={handleLoginSubmit}
                  status={loginFieldErrors.password ? 'error' : undefined}
                  tips={loginFieldErrors.password}
                />
                <div
                  className={`login-page__captcha${loginFieldErrors.captcha ? ' login-page__captcha--error' : ''}`}
                >
                  <div className="login-page__captcha-row">
                    <Input
                      size="large"
                      value={loginCaptchaCode}
                      onChange={(value) => {
                        setLoginCaptchaCode(String(value));
                        setLoginFieldErrors((prev) => ({ ...prev, captcha: undefined }));
                      }}
                      placeholder="图形验证码"
                      clearable
                      onEnter={handleLoginSubmit}
                      status={loginFieldErrors.captcha ? 'error' : undefined}
                      tips={loginFieldErrors.captcha}
                    />
                    <div className="login-page__captcha-img-wrap">
                      {loginCaptchaSvg ? (
                        <img
                          className="login-page__captcha-img"
                          src={svgCaptchaToDataUrl(loginCaptchaSvg)}
                          alt="图形验证码"
                        />
                      ) : (
                        <span className="login-page__captcha-placeholder">加载中…</span>
                      )}
                    </div>
                    <Button size="large" variant="outline" onClick={() => void loadLoginCaptcha()}>
                      换一张
                    </Button>
                  </div>
                </div>
                {/*
                <div className="login-page__reserve">
                  <div className="login-page__reserve-title">扩展位（后续支持手机号登录）</div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="手机号（预留）" disabled />
                  </div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="短信验证码（预留）" disabled />
                    <Button size="large" variant="outline" disabled>
                      发送验证码
                    </Button>
                  </div>
                </div>
                */}
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
                  onChange={(value) => {
                    setRegisterUsername(String(value));
                    setRegisterFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  placeholder="登录账号"
                  prefixIcon={<UserIcon />}
                  clearable
                  onEnter={handleRegisterSubmit}
                  status={registerFieldErrors.username ? 'error' : undefined}
                  tips={registerFieldErrors.username}
                />
                <Input
                  size="large"
                  value={registerNickname}
                  onChange={(value) => {
                    setRegisterNickname(String(value));
                    setRegisterFieldErrors((prev) => ({ ...prev, nickname: undefined }));
                  }}
                  placeholder="昵称"
                  clearable
                  onEnter={handleRegisterSubmit}
                  status={registerFieldErrors.nickname ? 'error' : undefined}
                  tips={registerFieldErrors.nickname}
                />
                <Input
                  size="large"
                  type="password"
                  value={registerPassword}
                  onChange={(value) => {
                    setRegisterPassword(String(value));
                    setRegisterFieldErrors((prev) => ({ ...prev, password: undefined, confirm: undefined }));
                  }}
                  placeholder="密码（8 位以上，含字母与数字）"
                  prefixIcon={<LockOnIcon />}
                  onEnter={handleRegisterSubmit}
                  status={registerFieldErrors.password ? 'error' : undefined}
                  tips={registerFieldErrors.password}
                />
                <Input
                  size="large"
                  type="password"
                  value={registerConfirmPassword}
                  onChange={(value) => {
                    setRegisterConfirmPassword(String(value));
                    setRegisterFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                  placeholder="确认密码"
                  prefixIcon={<LockOnIcon />}
                  onEnter={handleRegisterSubmit}
                  status={registerFieldErrors.confirm ? 'error' : undefined}
                  tips={registerFieldErrors.confirm}
                />
                <div
                  className={`login-page__captcha${registerFieldErrors.captcha ? ' login-page__captcha--error' : ''}`}
                >
                  <div className="login-page__captcha-row">
                    <Input
                      size="large"
                      value={registerCaptchaCode}
                      onChange={(value) => {
                        setRegisterCaptchaCode(String(value));
                        setRegisterFieldErrors((prev) => ({ ...prev, captcha: undefined }));
                      }}
                      placeholder="图形验证码"
                      clearable
                      onEnter={handleRegisterSubmit}
                      status={registerFieldErrors.captcha ? 'error' : undefined}
                      tips={registerFieldErrors.captcha}
                    />
                    <div className="login-page__captcha-img-wrap">
                      {registerCaptchaSvg ? (
                        <img
                          className="login-page__captcha-img"
                          src={svgCaptchaToDataUrl(registerCaptchaSvg)}
                          alt="图形验证码"
                        />
                      ) : (
                        <span className="login-page__captcha-placeholder">加载中…</span>
                      )}
                    </div>
                    <Button size="large" variant="outline" onClick={() => void loadRegisterCaptcha()}>
                      换一张
                    </Button>
                  </div>
                </div>
                {/*
                <div className="login-page__reserve">
                  <div className="login-page__reserve-title">扩展位（后续支持手机号注册）</div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="手机号（预留）" disabled />
                  </div>
                  <div className="login-page__reserve-row">
                    <Input size="large" placeholder="短信验证码（预留）" disabled />
                    <Button size="large" variant="outline" disabled>
                      发送验证码
                    </Button>
                  </div>
                </div>
                */}
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
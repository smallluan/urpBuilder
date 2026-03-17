import React, { useMemo, useState } from 'react';
import { Avatar, Button, Input, Upload } from 'tdesign-react';
import { LockOnIcon, RefreshIcon, UploadIcon, UserIcon } from 'tdesign-icons-react';
import { useNavigate } from 'react-router-dom';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { buildAvatarPresets, createGithubStyleAvatar, fileToDataUrl } from '../../utils/avatar';
import '../Login/style.less';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, authenticating } = useAuth();
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [presetSeedBase] = useState(() => `register-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const avatarPresets = useMemo(() => buildAvatarPresets(presetSeedBase, 24), [presetSeedBase]);
  const [avatarPresetIndex, setAvatarPresetIndex] = useState(0);
  const [uploadedAvatar, setUploadedAvatar] = useState('');
  const [avatarSource, setAvatarSource] = useState<'preset' | 'upload'>('preset');

  const selectedPresetAvatar = avatarPresets[avatarPresetIndex] || createGithubStyleAvatar(presetSeedBase);
  const selectedAvatar = avatarSource === 'upload' && uploadedAvatar ? uploadedAvatar : selectedPresetAvatar;

  const handleSwitchPreset = () => {
    setAvatarSource('preset');
    if (!avatarPresets.length) {
      return;
    }
    setAvatarPresetIndex((prev) => (prev + 1) % avatarPresets.length);
  };

  const handleUploadAvatar = async (files: any[]) => {
    const file = files?.[0]?.raw as File | undefined;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      emitApiAlert('上传失败', '仅支持图片文件');
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      emitApiAlert('上传失败', '头像大小不能超过 2MB');
      return;
    }

    try {
      const avatarData = await fileToDataUrl(file);
      if (!avatarData) {
        emitApiAlert('上传失败', '头像读取失败，请重试');
        return;
      }
      setUploadedAvatar(avatarData);
      setAvatarSource('upload');
      emitApiAlert('上传成功', '已使用自定义头像', 'success');
    } catch {
      emitApiAlert('上传失败', '头像读取失败，请重试');
    }
  };

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
        avatar: selectedAvatar,
        avatarSource,
        avatarSeed: avatarSource === 'preset' ? `${presetSeedBase}-${avatarPresetIndex + 1}` : undefined,
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
          <div className="login-page__avatar-picker">
            <div className="login-page__avatar-stage">
              <Avatar className="login-page__avatar-preview" image={selectedAvatar} shape="round" size="88px" />
              <div className="login-page__avatar-tools">
                <Upload
                  autoUpload={false}
                  max={1}
                  theme="custom"
                  accept="image/*"
                  showUploadProgress={false}
                  onSelectChange={handleUploadAvatar}
                >
                  <Button shape="circle" size="small" theme="default" variant="outline" icon={<UploadIcon />} />
                </Upload>
                <Button shape="circle" size="small" theme="default" variant="outline" icon={<RefreshIcon />} onClick={handleSwitchPreset} />
              </div>
            </div>
            <div className="login-page__avatar-actions">
              <div className="login-page__avatar-title">头像（可选）</div>
              <div className="login-page__avatar-sub">点击右上角图标上传，点击刷新图标切换默认头像</div>
              {avatarSource === 'upload' ? <div className="login-page__avatar-badge">已使用自定义头像</div> : null}
            </div>
          </div>

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
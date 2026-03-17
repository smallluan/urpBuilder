import React, { useMemo, useState } from 'react';
import { Avatar, Button, Card, Divider, Empty, Input, Upload } from 'tdesign-react';
import { LockOnIcon, RefreshIcon, UploadIcon, UserIcon } from 'tdesign-icons-react';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { buildAvatarPresets, fileToDataUrl, resolveUserAvatar } from '../../utils/avatar';
import './style.less';

const UserProfilePage: React.FC = () => {
  const { user, initialized, updateProfile, changePassword } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatarSource, setAvatarSource] = useState<'preset' | 'upload'>('preset');
  const [avatarPresetIndex, setAvatarPresetIndex] = useState(0);
  const [uploadedAvatar, setUploadedAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const avatarSeedBase = user?.id || user?.username || 'urp-user-profile';
  const avatarPresets = useMemo(() => buildAvatarPresets(`profile-${avatarSeedBase}`), [avatarSeedBase]);
  const selectedPresetAvatar = avatarPresets[avatarPresetIndex] || resolveUserAvatar({
    id: user?.id,
    username: user?.username,
    nickname: user?.nickname,
    avatar: user?.avatar,
  });
  const selectedAvatar = avatarSource === 'upload' && uploadedAvatar ? uploadedAvatar : selectedPresetAvatar;

  if (!initialized) {
    return <div className="user-profile-page">加载中...</div>;
  }

  if (!user) {
    return (
      <div className="user-profile-page user-profile-page--empty">
        <Empty description="请先登录后再维护个人信息" />
      </div>
    );
  }

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
      emitApiAlert('上传成功', '已选择自定义头像', 'success');
    } catch {
      emitApiAlert('上传失败', '头像读取失败，请重试');
    }
  };

  const handleSaveProfile = async () => {
    if (savingProfile) {
      return;
    }

    setSavingProfile(true);
    try {
      const nextUser = await updateProfile({
        nickname: nickname.trim() || undefined,
        avatar: selectedAvatar,
        avatarSource,
        avatarSeed: avatarSource === 'preset' ? `profile-${avatarSeedBase}-${avatarPresetIndex + 1}` : undefined,
      });
      setNickname(nextUser.nickname || '');
      if (avatarSource !== 'upload') {
        setUploadedAvatar('');
      }
      emitApiAlert('保存成功', '个人信息已更新', 'success');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      emitApiAlert('修改失败', '请完整填写密码信息');
      return;
    }

    if (newPassword !== confirmPassword) {
      emitApiAlert('修改失败', '两次输入的新密码不一致');
      return;
    }

    if (newPassword === currentPassword) {
      emitApiAlert('修改失败', '新密码不能与旧密码相同');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      emitApiAlert('修改成功', '密码已更新，请妥善保管', 'success');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="user-profile-page">
      <Card title="个人信息" bordered>
        <div className="user-profile-page__profile-grid">
          <div className="user-profile-page__avatar-column">
            <div className="user-profile-page__avatar-stage">
              <Avatar className="user-profile-page__avatar-preview" image={selectedAvatar} size="88px" shape="round" />
              <div className="user-profile-page__avatar-tools">
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
            <div className="user-profile-page__avatar-sub">点击图标上传头像，或切换默认头像</div>
            {avatarSource === 'upload' ? <div className="user-profile-page__avatar-badge">已使用自定义头像</div> : null}
          </div>

          <div className="user-profile-page__form-column">
            <Input value={user.username} readonly prefixIcon={<UserIcon />} placeholder="账号名" />
            <Input value={nickname} onChange={(value) => setNickname(String(value ?? ''))} placeholder="昵称" clearable />
            <Button theme="primary" loading={savingProfile} onClick={handleSaveProfile}>保存个人信息</Button>
          </div>
        </div>
      </Card>

      <Divider />

      <Card title="修改密码" bordered>
        <div className="user-profile-page__password-form">
          <Input
            type="password"
            value={currentPassword}
            onChange={(value) => setCurrentPassword(String(value ?? ''))}
            placeholder="当前密码"
            prefixIcon={<LockOnIcon />}
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(value) => setNewPassword(String(value ?? ''))}
            placeholder="新密码"
            prefixIcon={<LockOnIcon />}
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(value) => setConfirmPassword(String(value ?? ''))}
            placeholder="确认新密码"
            prefixIcon={<LockOnIcon />}
          />
          <Button theme="primary" loading={changingPassword} onClick={handleChangePassword}>更新密码</Button>
        </div>
      </Card>
    </div>
  );
};

export default UserProfilePage;

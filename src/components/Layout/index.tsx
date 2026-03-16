import React from 'react';
import { Dropdown, Layout, Menu, Select, Dialog } from 'tdesign-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  AppIcon,
  DataBaseIcon,
  CodeIcon,
  FileIcon,
  ApiIcon,
  SettingIcon,
  UserIcon,
} from 'tdesign-icons-react';
import { useAuth } from '../../auth/context';
import { useTeam } from '../../team/context';
import GlobalNoticeCenter from '../GlobalNoticeCenter';
import './style.less';

const { Header, Aside, Content } = Layout;
const { MenuItem, SubMenu } = Menu;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, deleteAccount } = useAuth();
  const { teams, currentTeamId, selectTeam, loading: teamLoading } = useTeam();
  const [deleteAccountVisible, setDeleteAccountVisible] = React.useState(false);
  const [deletingAccount, setDeletingAccount] = React.useState(false);

  const displayName = user?.nickname || user?.username || '未登录';
  const userInitial = displayName.slice(0, 1).toUpperCase();
  const roleSet = new Set((user?.roles ?? []).map((item) => String(item).toLowerCase()));
  const isPlatformAdmin = roleSet.has('admin') || roleSet.has('super_admin') || roleSet.has('platform_admin') || roleSet.has('root');
  const userMenuOptions = [
    {
      content: '注销账号',
      value: 'delete-account',
      theme: 'warning' as const,
    },
    {
      content: '退出登录',
      value: 'logout',
      theme: 'error' as const,
    },
  ];

  const menuItems = [
    {
      key: '/',
      icon: <HomeIcon />,
      title: '首页',
    },
    {
      key: 'build',
      icon: <AppIcon />,
      title: '构建应用',
      children: [
        {
          key: '/build-component',
          icon: <CodeIcon />,
          title: '构建组件',
        },
        {
          key: '/build-page',
          icon: <FileIcon />,
          title: '构建页面',
        },
      ],
    },
    {
      key: 'data',
      icon: <DataBaseIcon />,
      title: '数据管理',
      children: [
        {
          key: '/data-constance',
          icon: <SettingIcon />,
          title: '常量管理',
        },
        {
          key: '/data-api',
          icon: <ApiIcon />,
          title: 'API管理',
        },
      ],
    },
    {
      key: '/teams',
      icon: <UserIcon />,
      title: '团队协作',
    },
    ...(isPlatformAdmin
      ? [{
        key: '/user-admin',
        icon: <SettingIcon />,
        title: '用户管理',
      }]
      : []),
  ];

  const handleMenuClick = (value: any) => {
    navigate(value);
  };

  const handleUserMenuClick = async (data: { value?: string | number | Record<string, any> }) => {
    if (data.value === 'delete-account') {
      setDeleteAccountVisible(true);
      return;
    }

    if (data.value !== 'logout') {
      return;
    }

    await logout();
    navigate('/login', { replace: true });
  };

  const handleConfirmDeleteAccount = async () => {
    if (deletingAccount) {
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } finally {
      setDeletingAccount(false);
      setDeleteAccountVisible(false);
    }
  };

  const renderMenuItems = (items: any[]) => {
    return items.map((item) => {
      if (item.children) {
        return (
          <SubMenu key={item.key} title={item.title} icon={item.icon}>
            {item.children.map((child: any) => (
              <MenuItem key={child.key} value={child.key} icon={child.icon}>
                {child.title}
              </MenuItem>
            ))}
          </SubMenu>
        );
      }
      return (
        <MenuItem key={item.key} value={item.key} icon={item.icon}>
          {item.title}
        </MenuItem>
      );
    });
  };

  return (
    <Layout className="app-layout">
      <Header className="layout-header">
        <div className="header-left">
          <img src="/urpBuilder.png" alt="URP" className="header-logo" />
        </div>
        <div className="header-right">
          <div className="header-team-switcher">
            <Select
              value={currentTeamId || undefined}
              loading={teamLoading}
              placeholder="选择团队"
              style={{ width: 200 }}
              options={teams.map((team) => ({
                label: `${team.name}${team.role === 'owner' ? ' · 拥有者' : team.role === 'admin' ? ' · 管理员' : ''}`,
                value: team.id,
              }))}
              onChange={(value) => {
                const nextTeamId = String(value ?? '').trim();
                if (nextTeamId) {
                  selectTeam(nextTeamId);
                }
              }}
            />
          </div>
          <GlobalNoticeCenter />
          <Dropdown
            trigger="click"
            options={userMenuOptions}
            onClick={handleUserMenuClick}
            popupProps={{ overlayClassName: 'header-user-menu' }}
          >
            <button type="button" className="header-user-trigger">
              <span className="header-user-trigger__avatar">{userInitial}</span>
              <span className="header-user-trigger__name">{displayName}</span>
            </button>
          </Dropdown>
        </div>
      </Header>
      <Layout>
        <Aside width="240px" className="sidebar">
          <Menu
            value={location.pathname}
            onChange={handleMenuClick}
            className="sidebar-menu"
            defaultExpanded={['build', 'data']}
          >
            {renderMenuItems(menuItems)}
          </Menu>
        </Aside>
        <Content className="layout-content">
          <Outlet />
        </Content>
      </Layout>

      <Dialog
        visible={deleteAccountVisible}
        header="确认注销账号"
        confirmBtn={{
          theme: 'danger',
          loading: deletingAccount,
          content: '确认注销',
        }}
        cancelBtn={{
          disabled: deletingAccount,
          content: '取消',
        }}
        onClose={() => setDeleteAccountVisible(false)}
        onConfirm={handleConfirmDeleteAccount}
      >
        <div>注销后账号及相关归属数据将不可恢复，请确认继续。</div>
      </Dialog>
    </Layout>
  );
};

export default AppLayout;
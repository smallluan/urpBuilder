import React from 'react';
import { Button, Layout, Menu, Select } from 'tdesign-react';
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
import './style.less';

const { Header, Aside, Content } = Layout;
const { MenuItem, SubMenu } = Menu;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { teams, currentTeamId, selectTeam, loading: teamLoading } = useTeam();

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
  ];

  const handleMenuClick = (value: any) => {
    navigate(value);
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
            <span className="header-team-switcher__label">当前团队</span>
            <Select
              value={currentTeamId || undefined}
              loading={teamLoading}
              placeholder="选择团队"
              style={{ width: 220 }}
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
            <Button size="small" variant="text" onClick={() => navigate('/teams')}>
              管理团队
            </Button>
          </div>
          <div className="header-user">
            <span className="header-user__label">当前用户</span>
            <strong>{user?.nickname || user?.username || '未登录'}</strong>
          </div>
          <Button
            theme="default"
            variant="outline"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            退出登录
          </Button>
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
    </Layout>
  );
};

export default AppLayout;
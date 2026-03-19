import React from 'react';
import { Avatar, Button, Layout, Popup, Space, Row } from 'tdesign-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AddIcon,
  ChevronDownIcon,
  HomeIcon,
  AppIcon,
  CodeIcon,
  FileIcon,
  ApiIcon,
  SettingIcon,
  UserIcon,
} from 'tdesign-icons-react';
import { useAuth } from '../../auth/context';
import { useTeam } from '../../team/context';
import { resolveTeamAvatar, resolveUserAvatar } from '../../utils/avatar';
import GlobalNoticeCenter from '../GlobalNoticeCenter';
import AccountInfoPopup from './components/AccountInfoPopup';
import './style.less';

const { Header, Aside, Content } = Layout;

type FlatMenuSection = {
  title: string;
  items: Array<{ key: string; icon: React.ReactElement; title: string }>;
};

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    teams,
    currentTeam,
    currentTeamId,
    selectTeam,
    workspaceMode,
    setWorkspaceMode,
    loading,
  } = useTeam();

  const displayName = user?.nickname || user?.username || '未登录';
  const userAvatar = resolveUserAvatar({
    id: user?.id,
    username: user?.username,
    nickname: user?.nickname,
    avatar: user?.avatar,
  });
  const roleSet = new Set((user?.roles ?? []).map((item) => String(item).toLowerCase()));
  const isPlatformAdmin = roleSet.has('admin') || roleSet.has('super_admin') || roleSet.has('platform_admin') || roleSet.has('root');

  const menuSections = React.useMemo<FlatMenuSection[]>(() => {
    const baseSections: FlatMenuSection[] = [
      {
        title: '总览',
        items: [
          {
            key: '/',
            icon: <HomeIcon />,
            title: '首页',
          },
        ],
      },
      {
        title: '构建应用',
        items: [
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
        title: '数据管理',
        items: [
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
        title: '团队空间',
        items: workspaceMode === 'team'
          ? [
            {
              key: '/teams',
              icon: <AppIcon />,
              title: '团队看板',
            },
          ]
          : [],
      },
    ];

    if (isPlatformAdmin) {
      baseSections.push({
        title: '管理员',
        items: [
          {
            key: '/user-admin',
            icon: <UserIcon />,
            title: '用户管理',
          },
          {
            key: '/team-admin',
            icon: <SettingIcon />,
            title: '团队管理',
          },
        ],
      });
    }

    return baseSections.filter((section) => section.items.length > 0);
  }, [isPlatformAdmin, workspaceMode]);

  const currentSpaceLabel = workspaceMode === 'team' ? (currentTeam?.name || '团队空间') : '个人空间';

  const handleMenuClick = (value: any) => {
    navigate(value);
  };

  const handleOpenCreateTeam = () => {
    setWorkspaceMode('team');
    navigate('/teams?create=1');
  };

  const handleSwitchPersonalSpace = () => {
    setWorkspaceMode('personal');
    if (location.pathname === '/teams') {
      navigate('/');
    }
  };


  const renderSpacePopup = () => {
    return (
      <div className="space-switcher-popup">
        <div className="space-switcher-popup__section-title">个人空间</div>
        <div className={`space-item${workspaceMode === 'personal' ? ' is-active' : ''}`} onClick={handleSwitchPersonalSpace}>
          <Avatar size="30px" className="space-item__avatar" image={userAvatar}>{displayName.slice(0, 1)}</Avatar>
          <div className="space-item__meta">
            <span className="space-item__name">个人空间</span>
            <span className="space-item__sub">{displayName}</span>
          </div>
        </div>

        <div className="space-switcher-popup__section-title">团队空间</div>
        <div className="space-switcher-popup__team-list">
          {teams.length ? teams.map((team) => {
            const active = workspaceMode === 'team' && team.id === currentTeamId;
            return (
              <div
                key={team.id}
                className={`space-item${active ? ' is-active' : ''}`}
                onClick={async () => {
                  await selectTeam(team.id);
                  navigate('/teams');
                }}
              >
                <Avatar
                  size="30px"
                  className="space-item__avatar"
                  image={resolveTeamAvatar({ id: team.id, name: team.name, code: team.code, avatar: team.avatar })}
                >
                  {team.name.slice(0, 1)}
                </Avatar>
                <div className="space-item__meta">
                  <span className="space-item__name">{team.name}</span>
                  <span className="space-item__sub">{team.role === 'owner' ? '拥有者' : team.role === 'admin' ? '管理员' : '成员'}</span>
                </div>
              </div>
            );
          }) : <div className="space-switcher-popup__empty">暂无团队，先创建一个吧</div>}
        </div>

        <Button block variant="outline" icon={<AddIcon />} onClick={handleOpenCreateTeam}>创建新团队</Button>
      </div>
    );
  };

  return (
    <Layout className="app-layout">
      <Aside
        width="300px"
        className="sidebar"
      >
        <div className="sidebar-space-switcher-wrap">
          <Popup trigger="click" placement="bottom-left" showArrow={false} content={renderSpacePopup()}>
            <div className="sidebar-space-switcher">
              <Space size={8} align="center">
                <Avatar
                  size="30px"
                  className="sidebar-space-switcher__avatar"
                  image={workspaceMode === 'team'
                    ? resolveTeamAvatar({
                      id: currentTeam?.id,
                      name: currentTeam?.name,
                      code: currentTeam?.code,
                      avatar: currentTeam?.avatar,
                    })
                    : userAvatar}
                >
                  {currentSpaceLabel.slice(0, 1)}
                </Avatar>
                <span className="sidebar-space-switcher__label">{currentSpaceLabel}</span>
                <ChevronDownIcon size="16" />
              </Space>
            </div>
          </Popup>
        </div>

        <div className="sidebar-flat-menu">
          {menuSections.map((section) => (
            <div key={section.title} className="sidebar-section">
              <div className="sidebar-section__title">{section.title}</div>
              <div className="sidebar-section__items">
                {section.items.map((item) => {
                  const active = location.pathname === item.key || location.pathname.startsWith(`${item.key}/`);
                  return (
                    <Button
                      key={item.key}
                      variant={active ? 'base' : 'text'}
                      theme='default'
                      className={`sidebar-menu-button${active ? ' is-active' : ''}`}
                      icon={item.icon}
                      onClick={() => handleMenuClick(item.key)}
                    >
                      {item.title}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Aside>

      <Layout className="layout-main">
        <Header className="layout-header">
          <div className="header-left">
            <img src="/urpBuilder.png" alt="URP" className="header-logo" />
          </div>
          <Row className="header-right" style={{alignItems: 'center', gap: 24}}>
            <GlobalNoticeCenter />
            <Popup
              trigger="click"
              content={<AccountInfoPopup/>}
            >
              <Avatar className='user-avatar' size="36px" shape="circle">{displayName.slice(0, 2)}</Avatar>
            </Popup>
          </Row>
        </Header>

        <Content className="layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
import React from 'react';
import { Layout, Menu } from 'tdesign-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  AppIcon,
  DataBaseIcon,
  CodeIcon,
  FileIcon,
  ApiIcon,
  SettingIcon
} from 'tdesign-icons-react';
import './style.less';

const { Header, Aside, Content } = Layout;
const { MenuItem, SubMenu } = Menu;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
        <div className="header-title">
          URP Builder 管理系统
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
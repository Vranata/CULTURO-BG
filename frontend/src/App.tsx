// Placeholder for App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import { HomeOutlined, CalendarOutlined, LoginOutlined } from '@ant-design/icons';

// Страници
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Auth from './pages/Auth';

const { Header, Content, Footer } = Layout;

const App: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <Router>
        <Layout className="layout" style={{ minHeight: '100vh', background: '#f0f2f5' }}>
          <Header style={{ 
            display: 'flex', 
            alignItems: 'center', 
            position: 'sticky', 
            top: 0, 
            zIndex: 1, 
            width: '100%',
            padding: '0 24px'
          }}>
            <div className="demo-logo" style={{ 
              color: 'white', 
              marginRight: '48px', 
              fontWeight: 800, 
              fontSize: '1.25rem',
              letterSpacing: '1px'
            }}>
              SUBITIQ VBG
            </div>
            <Menu
              theme="dark"
              mode="horizontal"
              defaultSelectedKeys={['1']}
              style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
              items={[
                { key: '1', icon: <HomeOutlined />, label: <Link to="/">Начало</Link> },
                { key: '2', icon: <CalendarOutlined />, label: <Link to="/events">Събития</Link> },
                { key: '3', icon: <LoginOutlined />, label: <Link to="/auth">Вход</Link> },
              ]}
            />
          </Header>
          <Content style={{ padding: '0' }}>
            <div style={{ minHeight: 'calc(100vh - 134px)' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/auth" element={<Auth />} />
              </Routes>
            </div>
          </Content>
          <Footer style={{ textAlign: 'center', background: '#001529', color: 'rgba(255,255,255,0.65)', padding: '24px 50px' }}>
            <div style={{ marginBottom: '12px', color: '#fff' }}>SUBITIQ VBG</div>
            ©{new Date().getFullYear()} Created for Diploma Project • Итеративен модел на разработка
          </Footer>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;

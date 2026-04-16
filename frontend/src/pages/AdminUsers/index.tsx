import { UserOutlined, WarningOutlined, ArrowLeftOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Input, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { useUnit } from 'effector-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'atomic-router-react';
import { $specialUsers, downgradeUserFx, type AppUser } from '../../entities/model';
import { routes } from '../../shared/routing';

const { Title, Text, Paragraph } = Typography;

const AdminUsers: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');

  const { specialUsers, downgrade, isDowngrading } = useUnit({
    specialUsers: $specialUsers,
    downgrade: downgradeUserFx,
    isDowngrading: downgradeUserFx.pending,
  });

  const showDowngradeModal = (user: AppUser) => {
    setSelectedUser(user);
    setConfirmEmail('');
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedUser(null);
    setConfirmEmail('');
  };

  const handleConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      await downgrade({ userId: selectedUser.id, confirmEmail });
      messageApi.success(t('admin.success_downgrade', { email: selectedUser.email }));
      handleCancel();
    } catch (err: any) {
      messageApi.error(err.message || t('admin.error_downgrade'));
    }
  };

  const columns = [
    {
      title: t('admin.col_user'),
      key: 'user',
      render: (_: any, record: AppUser) => (
        <Space size="middle">
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            background: 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
          }}>
            <UserOutlined />
          </div>
          <div>
            <Text strong style={{ display: 'block', color: 'var(--text-primary)' }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('admin.col_role'),
      key: 'role',
      render: (_: any, record: AppUser) => (
        <Tag color="orange">{record.roleName}</Tag>
      ),
    },
    {
      title: t('admin.col_actions'),
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: AppUser) => (
        <Button 
          danger 
          icon={<CloseCircleOutlined />}
          onClick={() => showDowngradeModal(record)}
        >
          {t('admin.remove_rights')}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {contextHolder}
      
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Link to={routes.home}>
          <Button icon={<ArrowLeftOutlined />} shape="circle" />
        </Link>
        <Title level={2} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 'clamp(1.2rem, 5vw, 1.8rem)' }}>{t('admin.users_title')}</Title>
      </div>

      <Card 
        variant="borderless" 
        style={{ 
          background: 'var(--surface-bg)', 
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-soft)' 
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <Text type="secondary">{t('admin.users_subtitle')}</Text>
        </div>

        <Table 
          dataSource={specialUsers} 
          columns={columns} 
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('admin.empty_users') }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#ff4d4f' }} />
            <span>{t('admin.downgrade_modal_title')}</span>
          </Space>
        }
        open={isModalVisible}
        onOk={handleConfirm}
        onCancel={handleCancel}
        confirmLoading={isDowngrading}
        okText={t('admin.downgrade_confirm_btn')}
        cancelText={t('admin.cancel')}
        okButtonProps={{ 
          danger: true, 
          disabled: !selectedUser || confirmEmail.toLowerCase() !== selectedUser.email.toLowerCase() 
        }}
      >
        <div style={{ marginTop: '16px' }}>
          <Alert
            message={t('admin.downgrade_warning_title')}
            description={t('admin.downgrade_warning_desc')}
            type="warning"
            showIcon
            style={{ marginBottom: '20px' }}
          />
          
          <Paragraph>
            {t('admin.downgrade_instruction', { name: selectedUser?.name, email: selectedUser?.email })}
          </Paragraph>
          
          <Input 
            placeholder={t('admin.confirm_email_placeholder')} 
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            onPressEnter={() => {
              if (confirmEmail.toLowerCase() === selectedUser?.email.toLowerCase()) {
                handleConfirm();
              }
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;

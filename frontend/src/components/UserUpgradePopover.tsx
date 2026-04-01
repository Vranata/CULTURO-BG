import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Popover, Radio, Select, Space, Typography, message } from 'antd';
import { useUnit } from 'effector-react';
import type { AppUser } from '../entities/model';
import { $categoryOptions, fetchCategoriesFx } from '../entities/events/model';
import { supabase } from '../services/supabaseClient';

const { TextArea } = Input;

type UpgradeRequestValues = {
  applicantName: string;
  applicantEmail: string;
  specialtyCategoryId: string;
  applicantType: 'person' | 'company';
  companyIdentifier?: string;
  reason: string;
};

const adminEmail = 'culturobg@gmail.com';

const fallbackSpecialtyOptions = [
  { label: 'Концерти', value: '10' },
  { label: 'Спорт', value: '20' },
  { label: 'Театър', value: '30' },
  { label: 'Кино', value: '40' },
  { label: 'Фестивали', value: '50' },
];

const UserUpgradePopover: React.FC<{ user: AppUser }> = ({ user }) => {
  const [form] = Form.useForm<UpgradeRequestValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { categoryOptions, loadCategories } = useUnit({
    categoryOptions: $categoryOptions,
    loadCategories: fetchCategoriesFx,
  });

  useEffect(() => {
    if (categoryOptions.length === 0) {
      void loadCategories();
    }
  }, [categoryOptions.length, loadCategories]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    form.setFieldsValue({
      applicantName: user.name,
      applicantEmail: user.email,
      applicantType: 'person',
      specialtyCategoryId: categoryOptions[0]?.value ?? fallbackSpecialtyOptions[0].value,
    });
  }, [categoryOptions, form, isModalOpen, user.email, user.name]);

  const specialtyOptions = useMemo(
    () => (categoryOptions.length > 0 ? categoryOptions : fallbackSpecialtyOptions),
    [categoryOptions]
  );

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const handleSubmit = async (values: UpgradeRequestValues) => {
    const specialtyLabel = specialtyOptions.find((option) => option.value === values.specialtyCategoryId)?.label ?? values.specialtyCategoryId;
    const mailBody = [
      'Заявка за ъпгрейд към Special User',
      '',
      `Име: ${values.applicantName}`,
      `Имейл: ${values.applicantEmail}`,
      `Специалност/категория: ${specialtyLabel}`,
      `Тип: ${values.applicantType === 'company' ? 'Фирма' : 'Лице'}`,
      `EIK/INDDS: ${values.applicantType === 'company' ? values.companyIdentifier ?? '-' : '-'}`,
      '',
      'Мотивация:',
      values.reason,
      '',
      `Подал от: ${user.email}`,
      `Роля: ${user.roleName}`,
    ].join('\n');

    const mailto = `mailto:${adminEmail}?subject=${encodeURIComponent(`Upgrade request from ${values.applicantName}`)}&body=${encodeURIComponent(mailBody)}`;

    try {
      const { error } = await supabase.from('user_upgrade_requests').insert({
        auth_user_id: user.authUserId,
        applicant_name: values.applicantName,
        applicant_email: values.applicantEmail,
        specialty_category_id: Number(values.specialtyCategoryId),
        is_company: values.applicantType === 'company',
        company_identifier: values.applicantType === 'company' ? values.companyIdentifier ?? null : null,
        reason: values.reason,
      });

      if (error) {
        throw error;
      }

      message.success('Заявката е записана. Отваря се имейл към администратора.');
      setIsModalOpen(false);
      form.resetFields();
      window.location.href = mailto;
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Неуспешно изпращане на заявката.');
      window.location.href = mailto;
    }
  };

  const badge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          maxWidth: 200,
          height: 34,
          padding: '0 12px',
          borderRadius: 999,
          border: '1px solid var(--toggle-border)',
          background: 'var(--toggle-bg)',
          color: 'var(--header-text)',
          fontSize: '0.8rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {user.email}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 34,
          padding: '0 12px',
          borderRadius: 999,
          border: '1px solid var(--toggle-border)',
          background: 'var(--toggle-bg)',
          color: 'var(--header-text)',
          fontSize: '0.72rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {user.roleName}
      </span>
    </div>
  );

  const content = (
    <div style={{ maxWidth: 260 }}>
      <Typography.Title level={5} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
        ъпгрейд към Special User
      </Typography.Title>
      <Typography.Paragraph style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
        Изпрати кратка заявка и тя ще бъде подготвена за администратора.
      </Typography.Paragraph>
      <Button type="primary" block onClick={handleOpenModal}>
        Upgrade to Special User
      </Button>
    </div>
  );

  return (
    <>
      {user.roleName === 'User' ? (
        <Popover content={content} trigger="hover" placement="bottomRight">
          {badge}
        </Popover>
      ) : (
        badge
      )}

      <Modal
        open={isModalOpen}
        title="Заявка за Upgrade към Special User"
        okText="Изпрати"
        cancelText="Отказ"
        destroyOnClose
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit}>
          <Form.Item
            label="Име (на фирма или човек)"
            name="applicantName"
            rules={[{ required: true, message: 'Въведи име на фирма или човек.' }]}
          >
            <Input placeholder="Име на фирма или човек" size="large" />
          </Form.Item>

          <Form.Item
            label="Имейл"
            name="applicantEmail"
            rules={[
              { required: true, message: 'Въведи имейл адрес.' },
              { type: 'email', message: 'Въведи валиден имейл адрес.' },
            ]}
          >
            <Input placeholder="name@example.com" size="large" />
          </Form.Item>

          <Form.Item
            label="Специалност (категория)"
            name="specialtyCategoryId"
            rules={[{ required: true, message: 'Избери категория.' }]}
          >
            <Select
              size="large"
              placeholder="Избери категория"
              options={specialtyOptions}
            />
          </Form.Item>

          <Form.Item
            label="Тип заявител"
            name="applicantType"
            rules={[{ required: true, message: 'Избери тип заявител.' }]}
          >
            <Radio.Group>
              <Space direction="horizontal" wrap>
                <Radio value="person">Човек</Radio>
                <Radio value="company">Фирма</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(previous, next) => previous.applicantType !== next.applicantType}>
            {({ getFieldValue }) =>
              getFieldValue('applicantType') === 'company' ? (
                <Form.Item
                  label="EIK/INDDS"
                  name="companyIdentifier"
                  rules={[{ required: true, message: 'Въведи EIK/INDDS.' }]}
                >
                  <Input placeholder="EIK/INDDS" size="large" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            label="Защо да получиш тази роля?"
            name="reason"
            rules={[{ required: true, message: 'Опиши накратко мотивацията си.' }]}
          >
            <TextArea rows={5} placeholder="Обясни защо да бъдеш Special User" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UserUpgradePopover;
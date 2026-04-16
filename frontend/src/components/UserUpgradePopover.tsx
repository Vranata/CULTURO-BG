import { Button, Form, Input, Modal, Popover, Radio, Select, Space, Typography, message } from 'antd';
import { useUnit } from 'effector-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppUser } from '../entities/model';
import { $categoryOptions, fetchCategoriesFx } from '../entities/events/model';
import { $isLocationPromptOpen } from '../entities/location/model';
import { supabase } from '../services/supabaseClient';
import ProfileSettingsModal from './ProfileSettingsModal';
import { fallbackCategoryOptions } from '../shared/profileCategoryOptions';
import { hasLocalOnboardingCompletion } from '../shared/profileOnboarding';

const { TextArea } = Input;

type UpgradeRequestValues = {
  applicantName: string;
  applicantEmail: string;
  specialtyCategoryId: string;
  applicantType: 'person' | 'company';
  companyIdentifier?: string;
  reason: string;
};

type UserUpgradePopoverProps = {
  user: AppUser;
  variant?: 'horizontal' | 'vertical';
};

const UserUpgradePopover: React.FC<UserUpgradePopoverProps> = ({ user, variant = 'horizontal' }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<UpgradeRequestValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const surveyPromptedUserIdRef = useRef<string | null>(null);

  const { categoryOptions, loadCategories, isLocationPromptOpen } = useUnit({
    categoryOptions: $categoryOptions,
    loadCategories: fetchCategoriesFx,
    isLocationPromptOpen: $isLocationPromptOpen,
  });

  useEffect(() => {
    if (categoryOptions.length === 0) {
      void loadCategories();
    }
  }, [categoryOptions.length, loadCategories]);

  useEffect(() => {
    if (!user) {
      surveyPromptedUserIdRef.current = null;
      setIsSurveyOpen(false);
      setIsSettingsOpen(false);
      return;
    }

    if (user.onboardingCompleted || hasLocalOnboardingCompletion(user.authUserId)) {
      surveyPromptedUserIdRef.current = user.authUserId;
      setIsSurveyOpen(false);
      return;
    }

    if (surveyPromptedUserIdRef.current === user.authUserId) {
      return;
    }

    if (isLocationPromptOpen) {
      return;
    }

    const promptTimer = window.setTimeout(() => {
      if (surveyPromptedUserIdRef.current === user.authUserId) {
        return;
      }

      surveyPromptedUserIdRef.current = user.authUserId;
      setIsSurveyOpen(true);
    }, 600);

    return () => {
      window.clearTimeout(promptTimer);
    };
  }, [isLocationPromptOpen, user?.authUserId, user?.onboardingCompleted]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    form.setFieldsValue({
      applicantName: user.name,
      applicantEmail: user.email,
      applicantType: 'person',
      specialtyCategoryId: categoryOptions[0]?.value ?? fallbackCategoryOptions[0].value,
    });
  }, [categoryOptions, form, isModalOpen, user.email, user.name]);

  const specialtyOptions = useMemo(
    () => (categoryOptions.length > 0 ? categoryOptions : fallbackCategoryOptions),
    [categoryOptions]
  );

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleOpenSettings = () => {
    surveyPromptedUserIdRef.current = user.authUserId;
    setIsSurveyOpen(false);
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleSurveyCompleted = () => {
    setIsSurveyOpen(false);
  };

  const handleCloseModal = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  const handleSubmit = async (values: UpgradeRequestValues) => {
    const specialtyLabel = specialtyOptions.find((option) => option.value === values.specialtyCategoryId)?.label ?? values.specialtyCategoryId;
    const requestPayload = {
      applicantName: values.applicantName,
      applicantEmail: values.applicantEmail,
      specialtyCategory: specialtyLabel,
      specialtyCategoryId: Number(values.specialtyCategoryId),
      applicantType: values.applicantType,
      companyIdentifier: values.applicantType === 'company' ? values.companyIdentifier ?? null : null,
      reason: values.reason,
      submittedByEmail: user.email,
      submittedByRole: user.roleName,
    };

    const extractErrorMessage = (error: unknown, fallback: string) => {
      if (error instanceof Error && error.message) {
        return error.message;
      }

      if (typeof error === 'string' && error.trim()) {
        return error;
      }

      if (error && typeof error === 'object') {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
          return maybeMessage;
        }

        const maybeDetails = (error as { details?: unknown }).details;
        if (typeof maybeDetails === 'string' && maybeDetails.trim()) {
          return maybeDetails;
        }

        const maybeError = (error as { error?: unknown }).error;
        if (typeof maybeError === 'string' && maybeError.trim()) {
          return maybeError;
        }

        try {
          return JSON.stringify(error);
        } catch {
          return fallback;
        }
      }

      return fallback;
    };

    try {
      setIsSubmitting(true);

      const { data: requestRow, error } = await supabase.from('user_upgrade_requests').insert({
        auth_user_id: user.authUserId,
        applicant_name: values.applicantName,
        applicant_email: values.applicantEmail,
        specialty_category_id: Number(values.specialtyCategoryId),
        is_company: values.applicantType === 'company',
        company_identifier: values.applicantType === 'company' ? values.companyIdentifier ?? null : null,
        reason: values.reason,
      }).select('id_request').single();

      if (error || !requestRow) {
        throw new Error(t('profile.error_save_request', { error: extractErrorMessage(error, t('common.error_unknown')) }));
      }

      const requestPayloadExt = {
        ...requestPayload,
        requestId: requestRow.id_request,
        applicantAuthId: user.authUserId,
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-upgrade-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestPayloadExt),
      });

      const responseText = await response.text();

      if (!response.ok) {
        try {
          const parsedResponse = JSON.parse(responseText) as { error?: unknown; details?: unknown };
          throw new Error(t('profile.error_send_email', { error: extractErrorMessage(parsedResponse.details ?? parsedResponse.error ?? responseText, t('common.error_unknown')) }));
        } catch {
          throw new Error(t('profile.error_send_email', { error: responseText || `HTTP ${response.status}` }));
        }
      }

      message.success(t('profile.success_upgrade_request'));
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error(extractErrorMessage(error, t('profile.error_submit')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div style={{ maxWidth: 260 }}>
      <Typography.Title level={5} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
        {t('profile.upgrade_title')}
      </Typography.Title>
      <Typography.Paragraph style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
        {t('profile.upgrade_subtitle')}
      </Typography.Paragraph>
      <Button type="primary" block onClick={handleOpenModal}>
        {t('profile.upgrade_btn')}
      </Button>
    </div>
  );

  const badge = (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: variant === 'vertical' ? 'column' : 'row',
        alignItems: 'center', 
        gap: 8, 
        marginLeft: variant === 'vertical' ? 0 : 12 
      }}
    >
      <Popover
        trigger="hover"
        placement="bottomRight"
        content={
          <div style={{ maxWidth: 260 }}>
            <Typography.Title level={5} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
              {t('profile.settings_title')}
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
              {t('profile.settings_subtitle')}
            </Typography.Paragraph>
            <Button type="primary" block onClick={handleOpenSettings}>
              {t('profile.open_profile')}
            </Button>
          </div>
        }
      >
        <Button
          type="text"
          aria-label="Настройки на профила (преглед при ховър)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            width: variant === 'vertical' ? '100%' : 'auto',
            maxWidth: variant === 'vertical' ? 'none' : 200,
            height: 38,
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
            cursor: 'default',
          }}
        >
          {user.email}
        </Button>
      </Popover>

      {user.roleName === 'User' ? (
        <Popover content={content} trigger="hover" placement="bottomRight">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: variant === 'vertical' ? '100%' : 'auto',
              justifyContent: 'center',
              height: 38,
              padding: '0 12px',
              borderRadius: 999,
              border: '1px solid var(--toggle-border)',
              background: 'var(--toggle-bg)',
              color: 'var(--header-text)',
              fontSize: '0.72rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {user.roleName}
          </span>
        </Popover>
      ) : (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            width: variant === 'vertical' ? '100%' : 'auto',
            justifyContent: 'center',
            height: 38,
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
      )}
    </div>
  );

  return (
    <>
      {badge}

      <Modal
        open={isModalOpen}
        title={t('profile.upgrade_modal_title')}
        okText={t('forms.send')}
        cancelText={t('common.cancel')}
        destroyOnHidden
        confirmLoading={isSubmitting}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit}>
          <Form.Item
            label={t('profile.applicant_name_label')}
            name="applicantName"
            rules={[{ required: true, message: t('forms.validation.required') }]}
          >
            <Input placeholder={t('profile.applicant_name_placeholder')} size="large" />
          </Form.Item>

          <Form.Item
            label={t('profile.applicant_email_label')}
            name="applicantEmail"
            rules={[
              { required: true, message: t('forms.validation.email_required') },
              { type: 'email', message: t('forms.validation.email_invalid') },
            ]}
          >
            <Input placeholder={t('auth.email_placeholder')} size="large" />
          </Form.Item>

          <Form.Item
            label={t('profile.specialty_label')}
            name="specialtyCategoryId"
            rules={[{ required: true, message: t('forms.validation.category_required') }]}
          >
            <Select
              size="large"
              placeholder={t('forms.select_category')}
              options={specialtyOptions}
            />
          </Form.Item>

          <Form.Item
            label={t('profile.applicant_type_label')}
            name="applicantType"
            rules={[{ required: true, message: t('forms.validation.required') }]}
          >
            <Radio.Group>
              <Space orientation="horizontal" wrap>
                <Radio value="person">{t('profile.person')}</Radio>
                <Radio value="company">{t('profile.company')}</Radio>
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
            label={t('profile.reason_label')}
            name="reason"
            rules={[{ required: true, message: t('forms.validation.required') }]}
          >
            <TextArea rows={5} placeholder={t('profile.reason_placeholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <ProfileSettingsModal
        open={isSettingsOpen}
        mode="profile"
        user={user}
        categoryOptions={categoryOptions.length > 0 ? categoryOptions : fallbackCategoryOptions}
        onClose={handleSettingsClose}
        onCompleted={handleSettingsClose}
      />

      <ProfileSettingsModal
        open={isSurveyOpen}
        mode="survey"
        user={user}
        categoryOptions={categoryOptions.length > 0 ? categoryOptions : fallbackCategoryOptions}
        onClose={() => setIsSurveyOpen(false)}
        onCompleted={handleSurveyCompleted}
      />
    </>
  );
};

export default UserUpgradePopover;
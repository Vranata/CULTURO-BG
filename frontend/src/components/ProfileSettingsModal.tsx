import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AppUser } from '../entities/model';
import { refreshUserProfile } from '../entities/model';
import { supabase } from '../services/supabaseClient';
import { resetPassword, updateAccount } from '../shared/api/auth';
import { fallbackCategoryOptions } from '../shared/profileCategoryOptions';
import { setLocalOnboardingCompletion } from '../shared/profileOnboarding';

const isValidationError = (error: unknown) => Boolean(error && typeof error === 'object' && 'errorFields' in error);

type CategoryOption = {
  label: string;
  value: string;
};

type ProfileSettingsValues = {
  name: string;
  email: string;
  categoryIds: string[];
};

type UserRowId = {
  id_user: number;
};

type ProfileSettingsModalProps = {
  open: boolean;
  mode: 'profile' | 'survey';
  user: AppUser;
  categoryOptions: CategoryOption[];
  onClose: () => void;
  onCompleted: () => void;
};

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  open,
  mode,
  user,
  categoryOptions,
  onClose,
  onCompleted,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<ProfileSettingsValues>();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmailChange, setIsSendingEmailChange] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isEmailChangeVisible, setIsEmailChangeVisible] = useState(false);
  const [isPasswordChangeVisible, setIsPasswordChangeVisible] = useState(false);
  
  const localizedCategoryOptions = useMemo(() => {
    const options = categoryOptions.length > 0 ? categoryOptions : fallbackCategoryOptions;
    return options.map(opt => ({
      ...opt,
      label: t(`categories.${opt.value}`, opt.label)
    }));
  }, [categoryOptions, t]);

  const resolveCurrentUserDbId = async (retries = 2): Promise<number | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('id_user')
      .eq('auth_user_id', user.authUserId)
      .maybeSingle<UserRowId>();

    if (error) throw error;
    if (data?.id_user) return data.id_user;

    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return resolveCurrentUserDbId(retries - 1);
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id_user, id_category')
      .eq('auth_user_id', user.authUserId)
      .maybeSingle();

    const payload: any = {
      auth_user_id: user.authUserId,
      email: user.email,
      name_user: user.name,
      password_hash: 'supabase_auth_managed_placeholder',
    };

    if (!existingUser) {
      payload.id_category = 1;
      payload.id_region = 0;
      payload.profile_onboarding_completed = false;
    }

    const { data: upsertData, error: upsertError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'auth_user_id', ignoreDuplicates: false })
      .select('id_user, id_category')
      .single();

    if (upsertError) return null;
    return upsertData?.id_user ?? null;
  };

  useEffect(() => {
    if (!open) return;

    const loadProfilePreferences = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const currentUserDbId = await resolveCurrentUserDbId();

      if (currentUserDbId === null) {
        form.setFieldsValue({ name: user.name, email: user.email, categoryIds: [] });
        return;
      }

      const { data, error } = await supabase
        .from('user_likings')
        .select('id_event_category')
        .eq('id_user', currentUserDbId);

      if (error) {
        form.setFieldsValue({ name: user.name, email: user.email, categoryIds: [] });
        return;
      }

      const selectedCategoryIds = (data ?? []).map((row) => String(row.id_event_category));
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        categoryIds: selectedCategoryIds,
      });
    };

    void loadProfilePreferences().catch(() => {
      message.error(t('profile_settings.error_load'));
    });

    setIsEmailChangeVisible(false);
    setIsPasswordChangeVisible(false);
    setIsSendingEmailChange(false);
    setIsSendingPasswordReset(false);
  }, [form, open, user.email, user.authUserId, user.name, t]);

  const persistCategoryPreferences = async (categoryIds: string[]) => {
    const currentUserDbId = await resolveCurrentUserDbId();
    if (currentUserDbId === null) return;

    await supabase.from('user_likings').delete().eq('id_user', currentUserDbId);
    if (categoryIds.length === 0) return;

    await supabase.from('user_likings').insert(
      categoryIds.map((categoryId) => ({
        id_user: currentUserDbId,
        id_event_category: Number(categoryId),
      }))
    );
  };

  const handleSave = async (values: ProfileSettingsValues) => {
    setIsSaving(true);
    try {
      await persistCategoryPreferences(values.categoryIds);

      if (values.name !== user.name) {
        await updateAccount({ data: { full_name: values.name } });
        
        const currentUserDbId = await resolveCurrentUserDbId();
        if (currentUserDbId) {
          const { error: dbError } = await supabase
            .from('users')
            .update({ name_user: values.name })
            .eq('id_user', currentUserDbId);
          if (dbError) throw dbError;
        }
      }

      if (mode === 'survey') {
        const currentUserDbId = await resolveCurrentUserDbId();
        if (currentUserDbId) {
          await supabase.from('users').update({ profile_onboarding_completed: true }).eq('id_user', currentUserDbId);
          setLocalOnboardingCompletion(user.authUserId);
        }
      }

      message.success(t('profile_settings.success_saved'));
      refreshUserProfile();
      onCompleted();
    } catch (error: any) {
      if (!isValidationError(error)) {
        message.error(error.message || t('profile_settings.error_save'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsSendingPasswordReset(true);
    try {
      await resetPassword({ email: user.email, redirectTo: window.location.origin });
      message.success(t('profile_settings.pwd_reset_success'));
      setIsPasswordChangeVisible(false);
    } catch (error: any) {
      message.error(error.message || t('profile_settings.pwd_reset_error'));
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  const handleEmailChangeRequest = async () => {
    const newEmail = form.getFieldValue('email');
    if (!newEmail || newEmail === user.email) {
      message.warning(t('profile_settings.email_change_prompt'));
      return;
    }

    setIsSendingEmailChange(true);
    try {
      await updateAccount({ email: newEmail });
      message.success(t('profile_settings.email_change_success'));
      setIsEmailChangeVisible(false);
    } catch (error: any) {
      message.error(error.message || t('profile_settings.email_change_error'));
    } finally {
      setIsSendingEmailChange(false);
    }
  };

  return (
    <Modal
      title={mode === 'survey' ? t('profile_settings.survey_title') : t('profile_settings.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <div style={{ padding: '10px 0' }}>
        <Typography.Paragraph type="secondary">
          {t('profile_settings.email_password_note')}
        </Typography.Paragraph>

        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ name: user.name, email: user.email }}>
          <Form.Item name="name" label={t('profile_settings.name_label')} rules={[{ required: true, message: t('profile_settings.name_required') }]}>
            <Input placeholder={t('profile_settings.name_placeholder')} />
          </Form.Item>

          {isEmailChangeVisible ? (
            <Form.Item label={t('profile_settings.new_email_label')} style={{ marginBottom: 24 }}>
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item name="email" noStyle rules={[{ required: true, type: 'email', message: t('auth.email_invalid') }]}>
                  <Input placeholder={t('profile_settings.new_email_placeholder')} />
                </Form.Item>
                <Button type="primary" onClick={handleEmailChangeRequest} loading={isSendingEmailChange}>
                  {t('common.send')}
                </Button>
                <Button onClick={() => setIsEmailChangeVisible(false)}>{t('common.cancel')}</Button>
              </Space.Compact>
            </Form.Item>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <Button type="dashed" block onClick={() => setIsEmailChangeVisible(true)}>
                {t('profile_settings.change_email_btn')}
              </Button>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {t('profile_settings.email_current', { email: user.email })}
              </Typography.Text>
            </div>
          )}

          {isPasswordChangeVisible ? (
            <div style={{ marginBottom: 24, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <Typography.Paragraph>{t('profile_settings.password_reset_note')}</Typography.Paragraph>
              <Space>
                <Button type="primary" onClick={handlePasswordReset} loading={isSendingPasswordReset}>
                  {t('profile_settings.send_reset_link')}
                </Button>
                <Button onClick={() => setIsPasswordChangeVisible(false)}>{t('common.cancel')}</Button>
              </Space>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <Button type="dashed" block onClick={() => setIsPasswordChangeVisible(true)}>
                {t('profile_settings.change_password_btn')}
              </Button>
            </div>
          )}

          <Form.Item name="categoryIds" label={t('profile_settings.preferred_categories')}>
            <Select mode="multiple" placeholder={t('profile_settings.select_categories_placeholder')} style={{ width: '100%' }} options={localizedCategoryOptions} />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '24px' }}>
            {t('profile_settings.categories_hint')}
          </Typography.Text>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                {mode === 'survey' ? t('profile_settings.start_btn') : t('profile_settings.save_changes')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default ProfileSettingsModal;
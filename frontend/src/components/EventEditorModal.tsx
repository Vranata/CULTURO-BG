import React, { useEffect } from 'react';
import { Alert, Button, Col, DatePicker, Form, Input, Modal, Row, Select, TimePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { FilterOption, EventEditorValues, EventItem } from '../entities/events/model';
import { useTranslation } from 'react-i18next';

dayjs.extend(customParseFormat);

type EventEditorFormValues = {
  name: string;
  artist: string;
  place: string;
  description: string;
  regionId: string;
  categoryId: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  startHour: Dayjs | null;
  endHour: Dayjs | null;
};

type EventEditorModalProps = {
  open: boolean;
  title: string;
  confirmText: string;
  loading?: boolean;
  event: EventItem | null;
  regions: FilterOption[];
  categories: FilterOption[];
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: EventEditorValues) => Promise<void> | void;
};

const buildInitialValues = (event: EventItem | null): Partial<EventEditorFormValues> => ({
  name: event?.title ?? '',
  artist: event?.artist ?? '',
  place: event?.place ?? '',
  description: event?.description ?? '',
  regionId: event ? String(event.regionId) : undefined,
  categoryId: event ? String(event.categoryId) : undefined,
  startDate: event ? dayjs(event.startDate, 'YYYY-MM-DD') : null,
  endDate: event ? dayjs(event.endDate, 'YYYY-MM-DD') : null,
  startHour: event ? dayjs(event.startHour, ['HH:mm:ss', 'HH:mm']) : null,
  endHour: event ? dayjs(event.endHour, ['HH:mm:ss', 'HH:mm']) : null,
});

const EventEditorModal: React.FC<EventEditorModalProps> = ({
  open,
  title,
  confirmText,
  loading = false,
  event,
  regions,
  categories,
  errorMessage,
  onCancel,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<EventEditorFormValues>();
  const startDate = Form.useWatch('startDate', form);
  const endDate = Form.useWatch('endDate', form);
  const startHour = Form.useWatch('startHour', form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(buildInitialValues(event));
      return;
    }

    form.resetFields();
  }, [event, form, open]);

  const handleFinish = async (values: EventEditorFormValues) => {
    if (!values.startDate || !values.endDate || !values.startHour || !values.endHour) {
      return;
    }

    await onSubmit({
      name: values.name.trim(),
      artist: values.artist.trim(),
      place: values.place.trim(),
      description: values.description.trim(),
      regionId: values.regionId,
      categoryId: values.categoryId,
      startDate: values.startDate.format('YYYY-MM-DD'),
      endDate: values.endDate.format('YYYY-MM-DD'),
      startHour: values.startHour.format('HH:mm:ss'),
      endHour: values.endHour.format('HH:mm:ss'),
    });
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={confirmText}
      cancelText={t('events.cancel')}
      confirmLoading={loading}
      onOk={() => form.submit()}
      onCancel={onCancel}
      destroyOnHidden
      width={760}
    >
      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          style={{ marginBottom: '16px' }}
        />
      ) : null}

      <Form<EventEditorFormValues>
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={buildInitialValues(event)}
      >
        <Form.Item
          label={t('forms.labels.name')}
          name="name"
          rules={[
            { required: true, message: t('forms.validation.name_required') },
            { max: 120, message: t('forms.validation.name_max') },
          ]}
        >
          <Input placeholder={t('forms.placeholders.name')} />
        </Form.Item>

        <Form.Item
          label={t('forms.labels.place')}
          name="place"
          rules={[
            { required: true, message: t('forms.validation.place_required') },
            { max: 120, message: t('forms.validation.place_max') },
          ]}
        >
          <Input placeholder={t('forms.placeholders.place')} />
        </Form.Item>

        <Form.Item
          label={t('forms.labels.artist')}
          name="artist"
          rules={[
            { required: true, message: t('forms.validation.artist_required') },
            { max: 120, message: t('forms.validation.artist_max') },
          ]}
        >
          <Input placeholder={t('forms.placeholders.artist')} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label={t('forms.labels.region')}
              name="regionId"
              rules={[{ required: true, message: t('forms.validation.region_required') }]}
            >
              <Select placeholder={t('forms.placeholders.region')} options={regions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={t('forms.labels.category')}
              name="categoryId"
              rules={[{ required: true, message: t('forms.validation.category_required') }]}
            >
              <Select placeholder={t('forms.placeholders.category')} options={categories} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label={t('forms.labels.start_date')}
              name="startDate"
              rules={[{ required: true, message: t('forms.validation.start_date_required') }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(currentDate) => currentDate ? currentDate.isBefore(dayjs().startOf('day'), 'day') : false}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={t('forms.labels.end_date')}
              name="endDate"
              dependencies={['startDate']}
              rules={[
                { required: true, message: t('forms.validation.end_date_required') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const selectedStartDate = getFieldValue('startDate') as Dayjs | null;

                    if (!selectedStartDate || !value) {
                      return Promise.resolve();
                    }

                    if (value.isBefore(selectedStartDate, 'day')) {
                      return Promise.reject(new Error(t('forms.validation.end_date_after')));
                    }

                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(currentDate) => {
                  if (!startDate || !currentDate) {
                    return false;
                  }

                  return currentDate.isBefore(startDate, 'day');
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label={t('forms.labels.start_hour')}
              name="startHour"
              rules={[{ required: true, message: t('forms.validation.start_hour_required') }]}
            >
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={t('forms.labels.end_hour')}
              name="endHour"
              dependencies={['startDate', 'endDate', 'startHour']}
              rules={[
                { required: true, message: t('forms.validation.end_hour_required') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const selectedStartDate = getFieldValue('startDate') as Dayjs | null;
                    const selectedEndDate = getFieldValue('endDate') as Dayjs | null;
                    const selectedStartHour = getFieldValue('startHour') as Dayjs | null;

                    if (!selectedStartDate || !selectedEndDate || !selectedStartHour || !value) {
                      return Promise.resolve();
                    }

                    if (selectedStartDate.isSame(selectedEndDate, 'day') && !value.isAfter(selectedStartHour)) {
                      return Promise.reject(new Error(t('forms.validation.end_hour_after')));
                    }

                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={t('forms.labels.description')}
          name="description"
          rules={[
            { required: true, message: t('forms.validation.description_required') },
            { max: 500, message: t('forms.validation.description_max') },
          ]}
        >
          <Input.TextArea rows={4} placeholder={t('forms.placeholders.description')} />
        </Form.Item>

        <Button type="primary" htmlType="submit" style={{ display: 'none' }} />
      </Form>
    </Modal>
  );
};

export default EventEditorModal;

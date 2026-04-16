import { Modal, message } from 'antd';
import { useUnit } from 'effector-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { detectBulgarianRegionFromBrowserLocation, isLocationPermissionDeniedError } from '../shared/browserLocation';
import {
  $detectedLocationRegion,
  $isLocationPromptOpen,
  $locationPermissionState,
  locationPermissionChanged,
  locationPromptClosed,
  locationRegionDetected,
} from '../entities/location/model';

const LocationInitializer: React.FC = () => {
  const { t } = useTranslation();
  const [isResolving, setIsResolving] = useState(false);
  const { permissionState, detectedRegion, isPromptOpen, setPermissionState, setDetectedRegion, closePrompt } = useUnit({
    permissionState: $locationPermissionState,
    detectedRegion: $detectedLocationRegion,
    isPromptOpen: $isLocationPromptOpen,
    setPermissionState: locationPermissionChanged,
    closePrompt: locationPromptClosed,
    setDetectedRegion: locationRegionDetected,
  });

  const resolveLocation = async () => {
    setIsResolving(true);

    try {
      const nextRegion = await detectBulgarianRegionFromBrowserLocation();
      setPermissionState('accepted');
      setDetectedRegion(nextRegion);
      closePrompt();

      if (nextRegion) {
        message.success(t('location.success_detected', { region: nextRegion.regionName }));
      } else {
        message.info(t('location.info_no_region'));
      }
    } catch (error) {
      if (isLocationPermissionDeniedError(error)) {
        setPermissionState('declined');
        closePrompt();
        message.warning(t('location.warning_declined'));
        return;
      }

      closePrompt();
      message.error(error instanceof Error ? error.message : t('location.error_detection'));
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    if (!isPromptOpen) {
      return;
    }

    if (permissionState === 'accepted') {
      if (!detectedRegion) {
        void resolveLocation();
      } else {
        closePrompt();
      }
      return;
    }

    if (permissionState === 'declined') {
      closePrompt();
    }
  }, [closePrompt, detectedRegion, isPromptOpen, permissionState]);

  return (
    <Modal
      open={isPromptOpen && permissionState === 'unknown'}
      title={t('location.prompt_title')}
      okText={t('location.prompt_ok')}
      cancelText={t('location.prompt_cancel')}
      confirmLoading={isResolving}
      onOk={() => void resolveLocation()}
      onCancel={() => {
        setPermissionState('declined');
        closePrompt();
      }}
      centered
      mask={{ closable: false }}
      closable={false}
    >
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {t('location.prompt_text')}
      </div>
    </Modal>
  );
};

export default LocationInitializer;
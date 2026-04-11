import React, { useEffect, useRef, useState } from 'react';
import { Modal, message } from 'antd';
import { detectBulgarianRegionFromBrowserLocation, isLocationPermissionDeniedError } from '../shared/browserLocation';
import {
  $locationPermissionState,
  locationPermissionChanged,
  locationRegionDetected,
} from '../entities/location/model';
import { useUnit } from 'effector-react';

const LocationInitializer: React.FC = () => {
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const hasInitialized = useRef(false);
  const { permissionState, setPermissionState, setDetectedRegion } = useUnit({
    permissionState: $locationPermissionState,
    setPermissionState: locationPermissionChanged,
    setDetectedRegion: locationRegionDetected,
  });

  const resolveLocation = async () => {
    setIsResolving(true);

    try {
      const nextRegion = await detectBulgarianRegionFromBrowserLocation();
      setPermissionState('accepted');
      setDetectedRegion(nextRegion);
      setIsPromptVisible(false);

      if (nextRegion) {
        message.success(`Открихме локацията ти: ${nextRegion.regionName}.`);
      } else {
        message.info('Локацията е разрешена, но не успяхме да определим областта.');
      }
    } catch (error) {
      if (isLocationPermissionDeniedError(error)) {
        setPermissionState('declined');
        setIsPromptVisible(false);
        message.warning('Без достъп до локация ще показваме препоръки по профила ти или общо.');
        return;
      }

      setIsPromptVisible(false);
      message.error(error instanceof Error ? error.message : 'Не успяхме да определим локацията ти.');
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    if (permissionState === 'accepted') {
      void resolveLocation();
      return;
    }

    if (permissionState === 'unknown') {
      setIsPromptVisible(true);
    }
  }, [permissionState]);

  return (
    <Modal
      open={isPromptVisible}
      title="Използване на местоположение"
      okText="Разреши"
      cancelText="Не сега"
      confirmLoading={isResolving}
      onOk={() => void resolveLocation()}
      onCancel={() => {
        setPermissionState('declined');
        setIsPromptVisible(false);
      }}
      centered
      maskClosable={false}
      closable={false}
    >
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Ако разрешиш локация, ще показваме по-близките и препоръчаните събития според областта ти в България.
      </div>
    </Modal>
  );
};

export default LocationInitializer;
import { findBulgarianRegionByText } from './bulgarianRegions';

export type BrowserCoordinates = {
  latitude: number;
  longitude: number;
};

export type DetectedLocationRegion = {
  regionId: number;
  regionName: string;
  latitude: number;
  longitude: number;
  detectedAt: string;
};

type ReverseGeocodeAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  region?: string;
};

type ReverseGeocodeResponse = {
  address?: ReverseGeocodeAddress;
  display_name?: string;
};

const buildReverseGeocodeUrl = ({ latitude, longitude }: BrowserCoordinates) => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'bg-BG,bg,en',
  });

  return `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
};

const getBrowserCoordinates = (): Promise<BrowserCoordinates> => new Promise((resolve, reject) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    reject(new Error('Геолокацията не се поддържа от този браузър.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => {
      reject(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    }
  );
});

const isPermissionDeniedError = (error: unknown) => (
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && Number((error as { code?: number }).code) === 1
);

export const detectBulgarianRegionFromBrowserLocation = async (): Promise<DetectedLocationRegion | null> => {
  const coordinates = await getBrowserCoordinates();

  try {
    const response = await fetch(buildReverseGeocodeUrl(coordinates));

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as ReverseGeocodeResponse;
    const region = findBulgarianRegionByText(
      data.address?.city,
      data.address?.town,
      data.address?.village,
      data.address?.municipality,
      data.address?.county,
      data.address?.state_district,
      data.address?.state,
      data.address?.region,
      data.display_name,
    );

    if (!region) {
      return null;
    }

    return {
      regionId: region.id,
      regionName: region.name,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      detectedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const isLocationPermissionDeniedError = (error: unknown) => isPermissionDeniedError(error);

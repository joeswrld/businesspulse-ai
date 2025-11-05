import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your GA4 Measurement ID

export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
};

export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, eventParams);
  }
};

export const trackConversion = (conversionLabel: string, value?: number) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'conversion', {
      send_to: `${GA_MEASUREMENT_ID}/${conversionLabel}`,
      value: value,
    });
  }
};

export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('set', 'user_properties', properties);
  }
};

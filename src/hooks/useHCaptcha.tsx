import React, { useState, useRef, useCallback } from 'react';
import HCaptchaComponent, { HCaptchaRef } from '@/components/ui/HCaptcha';

interface UseHCaptchaOptions {
  siteKey: string;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: any) => void;
}

interface UseHCaptchaReturn {
  isVerified: boolean;
  token: string | null;
  error: string | null;
  reset: () => void;
  execute: () => void;
  HCaptchaComponent: React.ComponentType<{ className?: string }>;
}

export const useHCaptcha = ({
  siteKey,
  onVerify,
  onExpire,
  onError,
}: UseHCaptchaOptions): UseHCaptchaReturn => {
  const [isVerified, setIsVerified] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HCaptchaRef>(null);

  const handleVerify = useCallback((captchaToken: string) => {
    console.log('🔐 hCaptcha verification successful');
    setToken(captchaToken);
    setIsVerified(true);
    setError(null);
    onVerify?.(captchaToken);
  }, [onVerify]);

  const handleExpire = useCallback(() => {
    console.log('🔐 hCaptcha expired');
    setToken(null);
    setIsVerified(false);
    setError('Captcha has expired. Please complete it again.');
    onExpire?.();
  }, [onExpire]);

  const handleError = useCallback((captchaError: any) => {
    console.error('❌ hCaptcha error:', captchaError);
    setToken(null);
    setIsVerified(false);
    setError('Captcha verification failed. Please try again.');
    onError?.(captchaError);
  }, [onError]);

  const reset = useCallback(() => {
    console.log('🔐 Resetting hCaptcha');
    captchaRef.current?.reset();
    setToken(null);
    setIsVerified(false);
    setError(null);
  }, []);

  const execute = useCallback(() => {
    console.log('🔐 Executing hCaptcha');
    captchaRef.current?.execute();
  }, []);

  const HCaptchaWrapper = useCallback(({ className }: { className?: string }) => {
    return (
      <HCaptchaComponent
        ref={captchaRef as React.Ref<HCaptchaRef>}
        siteKey={siteKey}
        onVerify={handleVerify}
        onExpire={handleExpire}
        onError={handleError}
        className={className}
      />
    );
  }, [siteKey, handleVerify, handleExpire, handleError]);

  return {
    isVerified,
    token,
    error,
    reset,
    execute,
    HCaptchaComponent: HCaptchaWrapper,
  };
};
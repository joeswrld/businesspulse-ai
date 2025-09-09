import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface HCaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: any) => void;
  className?: string;
}

export interface HCaptchaRef {
  reset: () => void;
  execute: () => void;
}

const HCaptchaComponent = forwardRef<HCaptchaRef, HCaptchaProps>(
  ({ siteKey, onVerify, onExpire, onError, className }, ref) => {
    const captchaRef = useRef<HCaptcha>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        captchaRef.current?.resetCaptcha();
      },
      execute: () => {
        captchaRef.current?.execute();
      },
    }));

    const handleVerify = (token: string) => {
      console.log('🔐 hCaptcha verified:', token);
      onVerify(token);
    };

    const handleExpire = () => {
      console.log('🔐 hCaptcha expired');
      onExpire?.();
    };

    const handleError = (error: any) => {
      console.error('❌ hCaptcha error:', error);
      onError?.(error);
    };

    return (
      <div className={`h-captcha ${className || ''}`}>
        <HCaptcha
          ref={captchaRef}
          sitekey={siteKey}
          onVerify={handleVerify}
          onExpire={handleExpire}
          onError={handleError}
          theme="light"
          size="normal"
        />
      </div>
    );
  }
);

HCaptchaComponent.displayName = 'HCaptchaComponent';

export default HCaptchaComponent;
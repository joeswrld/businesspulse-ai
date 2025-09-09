import { supabase } from '@/integrations/supabase/client';

interface HCaptchaVerificationResult {
  success: boolean;
  error?: string;
  errorCodes?: string[];
  message?: string;
  challenge_ts?: string;
  hostname?: string;
}

export const verifyHCaptchaToken = async (token: string): Promise<HCaptchaVerificationResult> => {
  try {
    console.log('🔐 Verifying hCaptcha token with backend...');
    
    const { data, error } = await supabase.functions.invoke('verify-hcaptcha', {
      body: {
        token,
        action: 'auth'
      }
    });

    if (error) {
      console.error('❌ hCaptcha verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify hCaptcha token'
      };
    }

    console.log('✅ hCaptcha verification result:', data);
    return data as HCaptchaVerificationResult;

  } catch (error) {
    console.error('❌ hCaptcha verification error:', error);
    return {
      success: false,
      error: 'Network error during hCaptcha verification'
    };
  }
};

export const getHCaptchaErrorMessage = (errorCodes?: string[]): string => {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Captcha verification failed. Please try again.';
  }

  const errorMessages: { [key: string]: string } = {
    'missing-input-secret': 'The secret parameter is missing.',
    'invalid-input-secret': 'The secret parameter is invalid or malformed.',
    'missing-input-response': 'The response parameter is missing.',
    'invalid-input-response': 'The response parameter is invalid or malformed.',
    'bad-request': 'The request is invalid or malformed.',
    'invalid-or-already-seen-response': 'The response parameter has already been checked, or has expired.',
    'not-using-dummy-passcode': 'You have used a testing site key but have not used its matching secret.',
    'sitekey-secret-mismatch': 'The site key and secret do not match.',
  };

  const primaryError = errorCodes[0];
  return errorMessages[primaryError] || 'Captcha verification failed. Please try again.';
};
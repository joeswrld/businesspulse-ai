# hCaptcha Integration for Notex

This document describes the complete hCaptcha integration implemented for Notex authentication pages.

## Overview

hCaptcha has been integrated into all authentication forms (login, signup, and password reset) to prevent bot attacks and ensure secure user authentication.

## Features Implemented

### Frontend Integration
- ✅ hCaptcha widget added to login form
- ✅ hCaptcha widget added to signup form  
- ✅ hCaptcha widget added to password reset form
- ✅ Form submission blocked until captcha is completed
- ✅ Captcha tokens refreshed on page reload or verification failure
- ✅ Consistent styling with Notex design system
- ✅ Error handling and user feedback for captcha failures

### Backend Integration
- ✅ Supabase Edge Function for hCaptcha token verification
- ✅ Server-side validation using hCaptcha's verification API
- ✅ Proper error handling and response formatting
- ✅ CORS support for frontend requests

## Files Added/Modified

### New Files
- `src/components/ui/HCaptcha.tsx` - Reusable hCaptcha component
- `src/hooks/useHCaptcha.ts` - Custom hook for hCaptcha state management
- `src/utils/hcaptcha.ts` - Utility functions for hCaptcha verification
- `src/styles/hcaptcha.css` - Custom styling for hCaptcha widgets
- `supabase/functions/verify-hcaptcha/index.ts` - Backend verification function

### Modified Files
- `src/pages/AuthPage.tsx` - Added hCaptcha to all authentication forms
- `src/main.tsx` - Imported hCaptcha styles
- `package.json` - Added @hcaptcha/react-hcaptcha dependency

## Configuration

### Site Key
The hCaptcha site key is configured as: `79347ba8-9cbc-459e-bbaa-b98cb36040a6`

### Environment Variables Required
For the backend verification function, you need to set the hCaptcha secret key:

```bash
# In your Supabase project settings or environment
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key_here
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @hcaptcha/react-hcaptcha
```

### 2. Deploy Backend Function
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the hCaptcha verification function
supabase functions deploy verify-hcaptcha
```

### 3. Set Environment Variables
In your Supabase project dashboard:
1. Go to Settings > Edge Functions
2. Add the environment variable: `HCAPTCHA_SECRET_KEY`
3. Set the value to your hCaptcha secret key

### 4. Test the Integration
1. Start the development server: `npm run dev`
2. Navigate to the authentication page
3. Try to submit forms without completing the captcha (should be blocked)
4. Complete the captcha and submit (should work)
5. Test with invalid captcha tokens (should show error)

## How It Works

### Frontend Flow
1. User loads authentication page
2. hCaptcha widget is rendered with the site key
3. User completes the captcha challenge
4. On form submission, the captcha token is verified with the backend
5. If verification succeeds, the authentication process continues
6. If verification fails, an error message is shown and captcha is reset

### Backend Flow
1. Frontend sends captcha token to `/functions/v1/verify-hcaptcha`
2. Backend function calls hCaptcha's verification API with the secret key
3. hCaptcha API returns verification result
4. Backend returns success/failure response to frontend

## Error Handling

The integration includes comprehensive error handling:

- **Missing Captcha**: Form submission blocked with clear message
- **Verification Failure**: Specific error messages based on hCaptcha error codes
- **Network Errors**: Graceful fallback with retry option
- **Expired Tokens**: Automatic captcha reset and re-verification prompt

## Styling

The hCaptcha widgets are styled to match Notex's design system:
- Consistent border radius and colors
- Hover and focus states
- Responsive design for mobile devices
- Dark mode support
- Accessibility features

## Security Considerations

- Captcha tokens are verified server-side to prevent bypassing
- Tokens are single-use and expire automatically
- No sensitive data is stored in the frontend
- Proper CORS configuration for secure API calls

## Troubleshooting

### Common Issues

1. **Captcha not loading**
   - Check if the site key is correct
   - Verify network connectivity
   - Check browser console for errors

2. **Verification always fails**
   - Ensure the secret key is set correctly in Supabase
   - Check that the backend function is deployed
   - Verify the site key and secret key match

3. **Styling issues**
   - Ensure `hcaptcha.css` is imported in `main.tsx`
   - Check for CSS conflicts with existing styles

### Debug Mode
Enable debug logging by checking the browser console for messages prefixed with:
- `🔐` - hCaptcha related logs
- `❌` - Error messages
- `✅` - Success messages

## Future Enhancements

Potential improvements for the hCaptcha integration:
- Rate limiting for captcha attempts
- Analytics for captcha completion rates
- A/B testing different captcha configurations
- Integration with user analytics for bot detection

## Support

For issues with the hCaptcha integration:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify all configuration steps were completed
4. Test with a fresh browser session/incognito mode
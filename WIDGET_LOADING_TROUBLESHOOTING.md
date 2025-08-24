# Feedback Widget Loading Troubleshooting Guide

## Issue Description
The feedback widget is not appearing on the website after adding the embed code to index.html.

## Root Cause
The original embed code had a JavaScript syntax error due to unescaped apostrophes in the greeting text, causing the script to fail silently.

## Fixes Applied

### 1. **Fixed JavaScript String Escaping**
- **Problem**: `'We'd love to hear your feedback!'` had unescaped apostrophe
- **Solution**: Changed to `"We'd love to hear your feedback!"` using double quotes
- **Result**: JavaScript syntax is now valid

### 2. **Added Error Handling**
- **Added**: `onload` and `onerror` event handlers
- **Purpose**: Better debugging and error detection
- **Result**: Console logs will show if script loads successfully or fails

## Updated Embed Code

### Before (Broken)
```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://notex.com.ng/feedback-widget.js';
    script.setAttribute('data-project-id', 'NoteX_home');
    script.setAttribute('data-brand-color', '#506695');
    script.setAttribute('data-greeting-text', 'We'd love to hear your feedback!'); <!-- BROKEN -->
    script.setAttribute('data-widget-position', 'bottom-right');
    script.setAttribute('data-widget-location', 'inline');
    document.head.appendChild(script);
  })();
</script>
```

### After (Fixed)
```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://notex.com.ng/feedback-widget.js';
    script.setAttribute('data-project-id', 'NoteX_home');
    script.setAttribute('data-brand-color', '#506695');
    script.setAttribute('data-greeting-text', "We'd love to hear your feedback!");
    script.setAttribute('data-widget-position', 'bottom-right');
    script.setAttribute('data-widget-location', 'inline');
    script.onload = function() {
      console.log('Feedback widget script loaded successfully');
    };
    script.onerror = function() {
      console.error('Failed to load feedback widget script');
    };
    document.head.appendChild(script);
  })();
</script>
```

## Troubleshooting Steps

### Step 1: Check Browser Console
1. Open your website
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for:
   - ✅ "Feedback widget script loaded successfully" (success)
   - ❌ "Failed to load feedback widget script" (failure)
   - ❌ Any JavaScript errors

### Step 2: Verify Script Loading
1. Go to Network tab in Developer Tools
2. Refresh the page
3. Look for `feedback-widget.js` in the network requests
4. Check if it loads successfully (200 status) or fails (404, 500, etc.)

### Step 3: Check Script Source
1. Verify the URL: `https://notex.com.ng/feedback-widget.js`
2. Try opening this URL directly in browser
3. Should show JavaScript code or download the file

### Step 4: Verify HTML Implementation
1. Make sure the script is in the `<head>` section
2. Ensure it's not inside any conditional blocks
3. Check that the script tag is properly closed

## Common Issues and Solutions

### Issue 1: Script Not Loading
**Symptoms**: No network request for feedback-widget.js
**Solutions**:
- Check if the script tag is properly placed in HTML
- Verify no JavaScript errors are preventing execution
- Ensure the script is not blocked by ad blockers

### Issue 2: Script Loading but Widget Not Appearing
**Symptoms**: Script loads successfully but no widget visible
**Solutions**:
- Check if widget.js has proper CSS for visibility
- Verify widget positioning (bottom-right, inline, etc.)
- Check if widget is hidden behind other elements

### Issue 3: Console Errors
**Symptoms**: JavaScript errors in console
**Solutions**:
- Fix any syntax errors in the embed code
- Check for conflicts with other scripts
- Verify all attributes have valid values

### Issue 4: Widget Appears but Not Functioning
**Symptoms**: Widget visible but doesn't respond to clicks
**Solutions**:
- Check if widget.js has proper event handlers
- Verify no CSS conflicts are preventing interactions
- Check for JavaScript errors in widget functionality

## Testing the Fix

### 1. **Copy New Embed Code**
- Go to your feedback settings page
- Copy the newly generated embed code
- Replace the old code in your index.html

### 2. **Clear Browser Cache**
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache and cookies
- Try in incognito/private mode

### 3. **Check Console Output**
- Look for success message: "Feedback widget script loaded successfully"
- If you see error messages, note them for further debugging

### 4. **Verify Widget Appearance**
- Widget should appear in bottom-right corner (or specified position)
- Should be visible and clickable
- Should show your custom greeting text

## Debugging Tools

### Browser Developer Tools
- **Console**: JavaScript errors and logs
- **Network**: Script loading status
- **Elements**: HTML structure and CSS
- **Application**: Local storage and cookies

### Online Tools
- **JSFiddle**: Test embed code in isolation
- **CodePen**: Visual debugging of widget
- **Validator**: Check HTML/JavaScript syntax

## Prevention

### 1. **Always Test Embed Code**
- Copy from the settings page, don't modify manually
- Test in a development environment first
- Use browser console to verify loading

### 2. **Monitor Console Logs**
- Check for error messages regularly
- Look for successful loading messages
- Address any issues promptly

### 3. **Keep Settings Updated**
- Use the latest embed code from settings
- Don't hardcode values in HTML
- Let the system generate proper code

## Support

If the widget still doesn't work after applying these fixes:

1. **Check Console Logs**: Note any error messages
2. **Verify Script URL**: Ensure feedback-widget.js is accessible
3. **Test in Different Browser**: Rule out browser-specific issues
4. **Check Network**: Verify script loads successfully
5. **Contact Support**: Provide console logs and error details

## Conclusion

The main issue was JavaScript string escaping in the greeting text. The fix ensures:
- Proper JavaScript syntax
- Better error handling and debugging
- Reliable script loading
- Clear success/failure feedback

After applying the fix, the widget should load successfully and appear on your website as configured.
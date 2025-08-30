# Project ID Validation System

## Overview

The project ID validation system has been significantly improved to ensure that project IDs are unique across all users and properly validated before being saved.

## Key Improvements

### 1. Database Functions

Three new database functions have been added to `supabase/migrations/20250120000008_improved_project_id_validation.sql`:

#### `check_project_id_availability(project_id_param TEXT, current_user_id UUID)`
- Checks if a project ID is available for a specific user
- Returns detailed information about who owns the project ID if it's taken
- Excludes the current user from the check

#### `validate_project_id(project_id_param TEXT, current_user_id UUID)`
- Comprehensive validation function that checks:
  - Project ID is not empty
  - Project ID is at least 3 characters long
  - Project ID contains only valid characters (letters, numbers, hyphens, underscores)
  - Project ID is available (not taken by another user)
- Returns detailed validation results

#### `get_all_project_ids()`
- Admin/debugging function to view all project IDs in the system
- Useful for troubleshooting and verification

### 2. Frontend Improvements

#### Enhanced Validation Logic
- Real-time validation as users type (with 500ms debounce)
- Better error messages and user feedback
- Visual indicators for different validation states:
  - ✅ Available (green)
  - ❌ Taken (red)
  - ⚠ Invalid format (orange)
  - 🔄 Checking (blue)

#### Improved Save Validation
- Double-check validation before saving
- Prevents saving invalid or taken project IDs
- Better error handling and user feedback

### 3. Validation Rules

Project IDs must meet the following criteria:
- **Minimum length**: 3 characters
- **Valid characters**: Letters (a-z, A-Z), numbers (0-9), hyphens (-), underscores (_)
- **Uniqueness**: Must be unique across all users
- **Format**: No spaces or special characters

## Usage

### For Users
1. Enter a project ID in the feedback settings
2. The system will automatically check availability as you type
3. Visual indicators will show the status
4. You can only save if the project ID is valid and available
5. Once saved, the project ID is locked and cannot be changed

### For Developers
The validation functions can be called directly:

```javascript
// Check if a project ID is available
const { data, error } = await supabase.rpc('validate_project_id', {
  project_id_param: 'my-project',
  current_user_id: user.id
});

// Get all project IDs (for debugging)
const { data, error } = await supabase.rpc('get_all_project_ids');
```

## Testing

A test script `test-project-id-validation.js` is provided that can be run in the browser console to verify the validation functions work correctly.

## Debug Features

In development mode, the feedback settings page includes debug buttons:
- **Test Validation**: Tests the current project ID with the validation function
- **Show All IDs**: Displays all project IDs in the system

## Migration

To apply these improvements:

1. Run the new migration: `supabase/migrations/20250120000008_improved_project_id_validation.sql`
2. Deploy the updated frontend code
3. Test the validation system

## Security

- All functions use `SECURITY DEFINER` to ensure proper access control
- RLS (Row Level Security) policies are respected
- Functions only return necessary information
- User IDs are properly validated and excluded from checks

## Troubleshooting

If validation is not working:

1. Check that the migration has been applied
2. Verify the functions exist in the database
3. Check browser console for errors
4. Use the debug functions to test validation
5. Verify RLS policies are not blocking access

## Future Improvements

Potential enhancements:
- Project ID suggestions when taken
- Bulk validation for multiple project IDs
- Project ID reservation system
- Admin interface for managing project IDs
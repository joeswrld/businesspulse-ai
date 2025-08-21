# Project ID Fix for Feedback Settings

## Problem Description
The Feedback Settings page had an issue where:
1. On browser refresh, the Project ID would unlock and change to a random value
2. The Project ID field was not properly handling empty values
3. Users couldn't input their own Project ID initially

## Root Cause
The issue was in the `loadSettings` function in `src/pages/FeedbackSettings.tsx`. When no settings existed, it would:
1. Generate a random Project ID using `Date.now()` and `Math.random()`
2. Set `project_id_locked: false`
3. This happened every time the page was refreshed if no settings existed

Additionally, the database schema had `project_id TEXT UNIQUE NOT NULL`, which prevented empty values.

## Solution Implemented

### 1. Frontend Changes (`src/pages/FeedbackSettings.tsx`)
- **Modified `loadSettings` function**: Now creates default settings with an empty `project_id` instead of a random one
- **Improved Project ID input field**: 
  - Shows placeholder text when unlocked: "e.g., my-website-2024, company-feedback"
  - Shows the actual Project ID as placeholder when locked
  - Better validation messages
- **Enhanced save button**: Shows "Save & Lock Project ID" for first-time saves
- **Better user guidance**: Clear instructions about Project ID requirements

### 2. Database Schema Changes
- **Modified `setup-feedback-system.sql`**: Changed `project_id TEXT UNIQUE NOT NULL` to `project_id TEXT`
- **Added proper constraints**:
  - `project_id_locked_check`: Ensures Project ID is not empty when locked
  - `idx_feedback_settings_project_id_unique`: Unique index excluding empty values
- **Updated `migrate-feedback-system.sql`**: Added migration logic for existing databases

### 3. New Migration Script (`fix-project-id-constraint.sql`)
Created a standalone migration script to fix existing databases:
- Drops the old unique constraint
- Adds new constraints that allow empty values initially
- Updates any locked settings with empty Project IDs

## How to Apply the Fix

### For New Installations
1. Use the updated `setup-feedback-system.sql` script
2. The frontend changes are already included in the code

### For Existing Installations
1. **Run the migration script** in your Supabase SQL Editor:
   ```sql
   -- Run fix-project-id-constraint.sql
   ```
2. **Deploy the updated frontend code** with the changes to `FeedbackSettings.tsx`

## User Experience After Fix

### First Time Setup
1. User visits Feedback Settings page
2. Project ID field is empty with placeholder: "e.g., my-website-2024, company-feedback"
3. User enters their desired Project ID
4. User clicks "Save & Lock Project ID"
5. Project ID becomes permanently locked

### After First Save
1. Project ID field shows the locked value
2. Field is disabled with a "Locked" badge
3. Save button shows "Update Settings"
4. No more random Project ID changes on refresh

## Validation Rules
- Project ID must be at least 3 characters long
- Only allows letters, numbers, hyphens, and underscores
- Must be unique across all users
- Cannot be changed once locked

## Testing
To test the fix:
1. Clear your browser's local storage/cookies
2. Visit the Feedback Settings page
3. Verify the Project ID field is empty with proper placeholder
4. Enter a Project ID and save
5. Refresh the page and verify the Project ID remains locked
6. Try to edit the Project ID - it should be disabled

## Files Modified
- `src/pages/FeedbackSettings.tsx` - Main frontend fix
- `setup-feedback-system.sql` - Database schema update
- `migrate-feedback-system.sql` - Migration script update
- `fix-project-id-constraint.sql` - New migration script for existing databases
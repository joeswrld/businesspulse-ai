# Project ID Global Uniqueness Implementation

## Overview
This implementation ensures that each Project ID in the feedback system can only be used by one user globally, preventing conflicts and ensuring data integrity.

## Changes Made

### 1. Database Schema Updates
- **Migration Script**: `migrate-global-project-id-unique.sql`
- **Global Unique Constraint**: Added unique index on `project_id` across all users
- **Mandatory Field**: Project ID cannot be empty or null
- **Locking Mechanism**: Project ID is locked after first save

### 2. Frontend Updates (`FeedbackSettings.tsx`)
- **Mandatory Field**: Project ID field shows required indicator (*)
- **Initially Blank**: New users start with empty Project ID
- **Real-time Validation**: Checks availability as user types
- **Locking UI**: Shows lock status and prevents editing after save
- **Error Handling**: Displays appropriate messages for taken IDs
- **Save Button**: Disabled until valid Project ID is provided

### 3. Validation Rules
- **Required**: Project ID must be provided
- **Minimum Length**: At least 3 characters
- **Global Uniqueness**: Cannot be used by any other user
- **Locking**: Once saved, cannot be changed

## Key Features

### For New Users
- Start with empty Project ID field
- Must enter a unique Project ID before saving
- Real-time availability checking
- Clear error messages for taken IDs

### For Existing Users
- Project ID is locked if already set
- Cannot change existing Project ID
- Clear indication of locked status

### Security & Data Integrity
- Global uniqueness enforced at database level
- No duplicate Project IDs across users
- Proper constraint validation
- Audit trail through locking mechanism

## Database Constraints

```sql
-- Global unique constraint on project_id
CREATE UNIQUE INDEX idx_feedback_settings_project_id_global_unique 
ON feedback_settings (project_id) 
WHERE project_id IS NOT NULL AND project_id != '';

-- Ensure project_id is not empty
ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_not_empty 
CHECK (project_id IS NOT NULL AND project_id != '');

-- Ensure project_id is not empty when locked
ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_locked_check 
CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != ''));
```

## Deployment

### Option 1: Using Deployment Script
```bash
./deploy-global-project-id-unique.sh
```

### Option 2: Manual Deployment
1. Run the migration script:
   ```bash
   supabase db reset --linked
   ```

2. Verify the constraints:
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE indexname = 'idx_feedback_settings_project_id_global_unique';
   ```

## User Experience Flow

1. **New User Setup**
   - Opens feedback settings page
   - Sees empty Project ID field (required)
   - Types desired Project ID
   - System checks availability in real-time
   - Saves settings (Project ID becomes locked)

2. **Existing User**
   - Opens feedback settings page
   - Sees locked Project ID field
   - Cannot modify Project ID
   - Clear indication of locked status

3. **Error Scenarios**
   - Project ID already taken: Clear error message
   - Project ID too short: Validation error
   - Empty Project ID: Required field error

## Benefits

- **No Conflicts**: Each Project ID is unique across all users
- **Data Integrity**: Database-level constraints prevent duplicates
- **User Experience**: Clear feedback and validation
- **Security**: Project IDs are locked after first use
- **Scalability**: System can handle unlimited users with unique IDs

## Testing

### Test Cases
1. **New User Flow**
   - Create new user account
   - Navigate to feedback settings
   - Verify empty Project ID field
   - Test with taken Project ID
   - Test with valid Project ID
   - Verify locking after save

2. **Existing User Flow**
   - Login with existing user
   - Navigate to feedback settings
   - Verify locked Project ID field
   - Attempt to modify Project ID (should fail)

3. **Validation Tests**
   - Empty Project ID
   - Short Project ID (< 3 characters)
   - Duplicate Project ID
   - Special characters in Project ID

## Troubleshooting

### Common Issues
1. **Migration Fails**
   - Check Supabase CLI installation
   - Verify database connection
   - Check for existing constraints

2. **Frontend Errors**
   - Verify component imports
   - Check database schema
   - Validate user permissions

3. **Constraint Violations**
   - Check for duplicate Project IDs
   - Verify migration script execution
   - Review database logs

## Future Enhancements

- **Project ID Generation**: Auto-generate unique IDs
- **Transfer Mechanism**: Allow Project ID transfer between users
- **Bulk Operations**: Handle multiple Project IDs
- **Analytics**: Track Project ID usage patterns
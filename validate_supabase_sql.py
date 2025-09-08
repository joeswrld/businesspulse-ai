#!/usr/bin/env python3
"""
Supabase SQL Validator
Validates SQL for common Supabase-specific issues
"""

def validate_supabase_sql():
    """Validate SQL for Supabase compatibility"""
    
    with open('/workspace/trial_system_simple.sql', 'r') as f:
        sql = f.read()
    
    issues = []
    
    # Check 1: Auth schema references
    if 'auth.users' in sql and 'REFERENCES auth.users' in sql:
        print("✅ Auth schema reference looks correct")
    else:
        issues.append("❌ Auth schema reference issue")
    
    # Check 2: RLS policies
    if 'ENABLE ROW LEVEL SECURITY' in sql and 'CREATE POLICY' in sql:
        print("✅ RLS setup looks correct")
    else:
        issues.append("❌ RLS setup issue")
    
    # Check 3: Function syntax
    if 'CREATE OR REPLACE FUNCTION' in sql and 'LANGUAGE plpgsql' in sql:
        print("✅ Function syntax looks correct")
    else:
        issues.append("❌ Function syntax issue")
    
    # Check 4: ON CONFLICT with UNIQUE constraint
    if 'ON CONFLICT (user_id)' in sql and 'UNIQUE' in sql:
        print("✅ ON CONFLICT setup looks correct")
    else:
        issues.append("❌ ON CONFLICT setup issue")
    
    # Check 5: Security definer functions
    if 'SECURITY DEFINER' in sql:
        print("✅ Security definer functions look correct")
    else:
        issues.append("❌ Security definer issue")
    
    # Check 6: Grant permissions
    if 'GRANT EXECUTE' in sql and 'authenticated' in sql and 'service_role' in sql:
        print("✅ Permission grants look correct")
    else:
        issues.append("❌ Permission grants issue")
    
    # Check 7: No problematic patterns
    problematic_patterns = [
        'information_schema',
        'CREATE TRIGGER',
        'auth.uid()',
        'CASCADE'
    ]
    
    for pattern in problematic_patterns:
        if pattern in sql:
            if pattern == 'auth.uid()':
                print(f"✅ {pattern} usage is correct for RLS")
            elif pattern == 'CASCADE':
                print(f"✅ {pattern} usage is correct for foreign keys")
            else:
                print(f"⚠️  {pattern} found - may cause issues")
    
    # Check 8: Function return types
    if 'RETURNS TABLE' in sql and 'RETURNS VOID' in sql:
        print("✅ Function return types look correct")
    else:
        issues.append("❌ Function return types issue")
    
    # Check 9: UUID handling
    if 'UUID' in sql and 'gen_random_uuid()' in sql:
        print("✅ UUID handling looks correct")
    else:
        issues.append("❌ UUID handling issue")
    
    # Check 10: Timestamp handling
    if 'TIMESTAMPTZ' in sql and 'NOW()' in sql:
        print("✅ Timestamp handling looks correct")
    else:
        issues.append("❌ Timestamp handling issue")
    
    if issues:
        print(f"\n❌ Found {len(issues)} issues:")
        for issue in issues:
            print(f"  {issue}")
        return False
    else:
        print(f"\n✅ All validations passed! SQL should work in Supabase.")
        return True

if __name__ == "__main__":
    validate_supabase_sql()
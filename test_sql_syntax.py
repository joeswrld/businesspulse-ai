#!/usr/bin/env python3
"""
SQL Syntax Validator for Supabase/PostgreSQL
This script validates the SQL syntax before execution
"""

import re
import sys

def validate_sql_syntax(sql_content):
    """Validate SQL syntax for common issues"""
    issues = []
    
    # Check for common problematic patterns
    patterns = [
        (r'CREATE TABLE.*IF NOT EXISTS.*CREATE TABLE', 'Duplicate CREATE TABLE statements'),
        (r'DROP.*CASCADE.*CREATE.*REFERENCES', 'Potential foreign key issues'),
        (r'ON CONFLICT.*DO UPDATE.*COALESCE.*user_profiles\.', 'Potential ambiguous column references'),
        (r'information_schema\..*WHERE.*table_name.*=.*user_profiles', 'Potential schema reference issues'),
        (r'CREATE.*FUNCTION.*RETURNS.*TABLE.*\(', 'Complex function return types'),
        (r'TRIGGER.*ON.*auth\.users', 'Potential auth schema access issues'),
        (r'GRANT.*TO.*authenticated.*service_role', 'Permission grant patterns'),
    ]
    
    for pattern, description in patterns:
        if re.search(pattern, sql_content, re.IGNORECASE | re.MULTILINE):
            issues.append(f"⚠️  {description}")
    
    # Check for balanced parentheses and quotes
    paren_count = sql_content.count('(') - sql_content.count(')')
    if paren_count != 0:
        issues.append(f"⚠️  Unbalanced parentheses: {paren_count}")
    
    # Check for semicolon termination
    lines = sql_content.split('\n')
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if line and not line.startswith('--') and not line.endswith(';') and not line.endswith('$$'):
            if not any(keyword in line.upper() for keyword in ['CREATE', 'ALTER', 'DROP', 'GRANT', 'SELECT', 'INSERT', 'UPDATE', 'DELETE']):
                continue
            if not line.endswith(';') and '$$' not in line:
                issues.append(f"⚠️  Line {i} might need semicolon: {line[:50]}...")
    
    return issues

def main():
    """Main validation function"""
    try:
        with open('/workspace/trial_system_final_tested.sql', 'r') as f:
            sql_content = f.read()
        
        print("🔍 Validating SQL syntax...")
        issues = validate_sql_syntax(sql_content)
        
        if issues:
            print("❌ Issues found:")
            for issue in issues:
                print(f"  {issue}")
            return False
        else:
            print("✅ SQL syntax validation passed!")
            return True
            
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
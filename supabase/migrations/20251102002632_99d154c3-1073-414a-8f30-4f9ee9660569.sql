-- Fix initialize_user_data to use correct routes
CREATE OR REPLACE FUNCTION public.initialize_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_project_id UUID;
  v_base_url TEXT := 'https://notex.com.ng';
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM billing_profiles WHERE user_id = p_user_id) THEN
    INSERT INTO billing_profiles (user_id, plan, subscription_status, trial_ends_at, created_at, updated_at)
    VALUES (p_user_id, 'trial', 'trial', now() + INTERVAL '8 days', now(), now());
    RAISE NOTICE 'Created billing profile for user %', p_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM projects WHERE user_id = p_user_id) THEN
    INSERT INTO projects (user_id, name, created_at, updated_at)
    VALUES (p_user_id, 'My Project', now(), now())
    RETURNING id INTO v_project_id;
    RAISE NOTICE 'Created project % for user %', v_project_id, p_user_id;
  ELSE
    SELECT id INTO v_project_id FROM projects WHERE user_id = p_user_id LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM feedback_settings WHERE user_id = p_user_id) THEN
    INSERT INTO feedback_settings (
      user_id, 
      project_id, 
      customer_survey_url, 
      product_feedback_url, 
      widget_code, 
      customer_satisfaction_enabled,
      product_feedback_enabled,
      created_at, 
      updated_at
    )
    VALUES (
      p_user_id,
      v_project_id,
      v_base_url || '/survey/' || v_project_id,
      v_base_url || '/feedback/' || v_project_id,
      '<script src="' || v_base_url || '/widget.js" data-project-id="' || v_project_id || '"></script>',
      true,
      true,
      now(),
      now()
    );
    RAISE NOTICE 'Created feedback settings for user %', p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'project_id', v_project_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in initialize_user_data: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
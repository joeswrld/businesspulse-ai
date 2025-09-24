import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

interface ProjectIdResult {
  projectId: string | null;
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
}

/**
 * Hook to dynamically detect project ID from various sources:
 * 1. URL parameters (/:projectId)
 * 2. URL search params (?project_id=...)
 * 3. Data attributes on the page
 * 4. Session storage
 */
export const useProjectId = (): ProjectIdResult => {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const params = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const detectProjectId = () => {
      setIsValidating(true);
      setError(null);

      // 1. Check URL parameters first (/:projectId)
      if (params.projectId) {
        setProjectId(params.projectId);
        setIsValid(true);
        setIsValidating(false);
        return;
      }

      // 2. Check URL search parameters (?project_id=...)
      const searchProjectId = searchParams.get('project_id');
      if (searchProjectId) {
        setProjectId(searchProjectId);
        setIsValid(true);
        setIsValidating(false);
        return;
      }

      // 3. Check data attributes on the page
      const dataProjectId = document.querySelector('[data-project-id]')?.getAttribute('data-project-id');
      if (dataProjectId) {
        setProjectId(dataProjectId);
        setIsValid(true);
        setIsValidating(false);
        return;
      }

      // 4. Check session storage
      const sessionProjectId = sessionStorage.getItem('notex_project_id');
      if (sessionProjectId) {
        setProjectId(sessionProjectId);
        setIsValid(true);
        setIsValidating(false);
        return;
      }

      // 5. Check localStorage as fallback
      const localProjectId = localStorage.getItem('notex_project_id');
      if (localProjectId) {
        setProjectId(localProjectId);
        setIsValid(true);
        setIsValidating(false);
        return;
      }

      // No project ID found
      setProjectId(null);
      setIsValid(false);
      setError('Project ID not found. Please ensure you have a valid project link or ID.');
      setIsValidating(false);
    };

    detectProjectId();
  }, [params.projectId, searchParams]);

  return {
    projectId,
    isValidating,
    isValid,
    error
  };
};
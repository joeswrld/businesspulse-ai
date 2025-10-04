import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  status: "active" | "expired" | "none";
  trialDaysRemaining: number;
  plan?: string;
}

export const useSubscriptionStatus = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    status: "none",
    trialDaysRemaining: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSubscription({ status: "none", trialDaysRemaining: 0 });
          setLoading(false);
          return;
        }

        // Fetch profile + subscription info from RPC
        const { data: profileData, error } = await supabase
          .rpc("get_user_profile_with_access", { user_uuid: user.id });

        if (error || !profileData || profileData.length === 0) {
          setSubscription({ status: "none", trialDaysRemaining: 0 });
        } else {
          const profile = profileData[0];
          let trialDays = 0;
          if (profile.trial_end) {
            const now = new Date();
            const trialEnd = new Date(profile.trial_end);
            trialDays = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }

          const status =
            profile.subscription_status === "active" || trialDays > 0
              ? "active"
              : "expired";

          setSubscription({
            status,
            trialDaysRemaining: trialDays,
            plan: profile.plan || undefined,
          });
        }
      } catch (err) {
        console.error("Error fetching subscription status:", err);
        setSubscription({ status: "none", trialDaysRemaining: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return { subscription, loading };
};

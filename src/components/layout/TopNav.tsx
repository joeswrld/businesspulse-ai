import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface TopNavProps {
  className?: string;
}

export default function TopNav({ className }: TopNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user;
      setUser(currentUser);
      if (currentUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .single();
        if (profileData) setProfile(profileData as any);
      }
    };
    load();
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick, { passive: true } as any);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick as any);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsOpen(false);
      navigate("/login");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Sign out failed", err);
    }
  };

  return (
    <div className={cn("sticky top-0 z-40 w-full bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200", className)}>
      <div className="h-14 md:h-16 px-3 md:px-6 flex items-center justify-between">
        {/* Left: Logo / Brand */}
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 min-w-0">
          <img src="/favicon.ico" alt="NoteX" className="h-6 w-6 md:h-8 md:w-8 rounded" />
          <span className="font-semibold text-sm md:text-base truncate">NoteX</span>
        </Link>

        {/* Right: Avatar */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => setIsOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label="User menu"
          >
            <Avatar className="h-9 w-9 md:h-10 md:w-10">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{profile?.first_name?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </Button>

          {/* Dropdown */}
          <div
            className={cn(
              "absolute right-0 mt-2 w-48 md:w-56 origin-top-right rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 transition ease-out duration-150",
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            )}
            role="menu"
          >
            <div className="py-1">
              <Link
                to="/profile"
                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/settings"
                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </Link>
              <button
                className="w-full text-left block px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                role="menuitem"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


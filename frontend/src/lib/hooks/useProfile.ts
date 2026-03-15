"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/user";

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (currentUser: User) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      if (mounted) setProfile(data ?? null);
    };

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async ({
    full_name,
  }: {
    full_name: string;
  }): Promise<Profile | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name })
      .eq("id", user.id)
      .select()
      .single();
    if (!error && data) setProfile(data);
    return data ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return { user, profile, isLoading, updateProfile, signOut };
}

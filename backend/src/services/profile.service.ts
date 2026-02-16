import { supabaseAdmin } from "../config/supabase";

export type ProfileRecord = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

export const updateProfileFullName = async (
  userId: string,
  fullName: string
): Promise<ProfileRecord> => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId)
    .select("id, email, full_name, avatar_url, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to update profile.");
  }

  return data as ProfileRecord;
};

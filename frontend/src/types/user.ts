export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
};

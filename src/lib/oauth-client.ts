import { supabase } from "@/integrations/supabase/client";
type Details = {
  client?: { name?: string; client_name?: string };
  redirect_uri?: string;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type Result<T> = { data: T | null; error: { message: string } | null };
type OAuthClient = {
  getAuthorizationDetails: (id: string) => Promise<Result<Details>>;
  approveAuthorization: (id: string) => Promise<Result<{ redirect_url?: string; redirect_to?: string }>>;
  denyAuthorization: (id: string) => Promise<Result<{ redirect_url?: string; redirect_to?: string }>>;
};
export const oauthClient = (supabase.auth as unknown as { oauth: OAuthClient }).oauth;
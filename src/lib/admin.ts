import { supabase } from "@/integrations/supabase/client";

/** Whether the signed-in user holds the admin role (row readable only by its owner; RLS enforces real access). */
export const isAdminQuery = (userId: string) => ({
  queryKey: ["is-admin", userId],
  queryFn: async () => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    return !!data;
  },
  staleTime: 300_000,
});

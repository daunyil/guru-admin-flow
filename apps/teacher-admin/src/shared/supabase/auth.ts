import type { Session, User } from "@supabase/supabase-js";
import { requireSupabase, supabase } from "./client";

export type TeacherRole = "teacher" | "admin" | "viewer";

export type CloudTeacherProfile = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  role: TeacherRole;
  is_active: boolean;
};

export type CloudAuthState = {
  session: Session | null;
  user: User | null;
  profile: CloudTeacherProfile | null;
};

export async function getCurrentCloudAuthState(): Promise<CloudAuthState> {
  if (!supabase) return { session: null, user: null, profile: null };

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session ?? null;
  const user = session?.user ?? null;

  if (!user) return { session, user: null, profile: null };

  const { data: profile } = await supabase
    .from("teacher_profiles")
    .select("id,user_id,full_name,email,role,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return { session, user, profile: (profile as CloudTeacherProfile | null) ?? null };
}

export async function signInTeacher(email: string, password: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutTeacher(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

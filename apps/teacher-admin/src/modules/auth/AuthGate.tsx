import { type ReactNode, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../shared/supabase/client";
import { getCurrentCloudAuthState, signInTeacher, signOutTeacher, type CloudTeacherProfile } from "../../shared/supabase/auth";

type AuthStatus = "loading" | "local" | "signed-out" | "missing-profile" | "signed-in";

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? "loading" : "local");
  const [profile, setProfile] = useState<CloudTeacherProfile | null>(null);

  async function refreshAuth() {
    if (!isSupabaseConfigured) {
      setStatus("local");
      return;
    }
    const state = await getCurrentCloudAuthState();
    setProfile(state.profile);
    if (!state.user) setStatus("signed-out");
    else if (!state.profile) setStatus("missing-profile");
    else setStatus("signed-in");
  }

  useEffect(() => {
    void refreshAuth();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshAuth();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (status === "local" || status === "signed-in") {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Memuat login...</div>;
  }

  if (status === "missing-profile") {
    return <MissingProfile profile={profile} onSignOut={() => void signOutTeacher()} />;
  }

  return <LoginPanel onSignedIn={() => void refreshAuth()} />;
}

function LoginPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInTeacher(email.trim(), password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">SIAKAD GURU</p>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Login Guru</h1>
          <p className="text-sm text-slate-500 mt-1">Masuk dengan akun guru yang dibuat di Supabase.</p>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Password
          <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-brand-600 text-white font-bold py-3 disabled:opacity-60">
          {busy ? "Memeriksa..." : "Masuk"}
        </button>
        <p className="text-xs text-slate-400">Mode login hanya aktif jika VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diisi.</p>
      </form>
    </div>
  );
}

function MissingProfile({ profile, onSignOut }: { profile: CloudTeacherProfile | null; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-3">
        <h1 className="text-xl font-black text-slate-900">Profil guru belum terhubung</h1>
        <p className="text-sm text-slate-600">
          Akun login sudah masuk, tetapi belum ada baris aktif di tabel teacher_profiles untuk user ini.
        </p>
        {profile && <p className="text-xs text-slate-400">Profil terdeteksi: {profile.full_name}</p>}
        <button onClick={onSignOut} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          Keluar
        </button>
      </div>
    </div>
  );
}

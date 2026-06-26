/**
 * RELEASE-CODE-COMPLETE-01: Error Boundary
 *
 * Mencegah blank putih saat komponen crash. Tampilkan pesan error
 * yang ramah guru + tombol reload.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Komponen crash:", error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-2xl mb-3">
                ⚠
              </div>
              <h1 className="text-lg font-bold text-slate-900">Halaman Bermasalah</h1>
              <p className="text-sm text-slate-500 mt-1">
                Terjadi kesalahan saat memuat halaman. Data Anda tetap aman.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 font-mono break-all max-h-32 overflow-y-auto">
              {this.state.error?.message ?? "Unknown error"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.hash = "#/"; }}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Ke Beranda
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Muat Ulang
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Bila masalah berulang, buat backup lalu hubungi pengembang.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

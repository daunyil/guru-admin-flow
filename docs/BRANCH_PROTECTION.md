# Branch Protection — Setup Instructions

Branch protection wajib di-setup di repo `daunyil/guru-admin-flow` setelah PR Sprint 1 di-merge. Tanpa ini, CI workflow tidak akan memblokir merge yang gagal.

## Setup (manual, 2 menit)

1. Buka: https://github.com/daunyil/guru-admin-flow/settings/branches
2. Klik **"Add branch protection rule"**
3. Branch name pattern: `main`
4. Centang rules berikut:

   - ✅ **Require a pull request before merging**
     - Required approving reviews: `1`
     - Dismiss stale pull request approvals when new commits are pushed: ✅
     - Require review from Code Owners: ❌ (belum ada CODEOWNERS, opsional)
   - ✅ **Require status checks to pass before merging**
     - Require branches to be up to date before merging: ✅
     - Status checks yang wajib lulus (pilih dari list):
       - `Typecheck (3 workspace)`
       - `Test (Vitest)`
       - `Build (Vite)`
       - `Audit (security & scope)`
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**
     - Hanya admin yang bisa bypass. Untuk MVP, jangan bypass.

5. Klik **"Create"** atau **"Save changes"**

## Verifikasi

Setelah setup, coba buat PR dengan kode yang sengaja fail test (misal: hapus satu baris di rules.ts yang merusak rule test). PR harus menampilkan ✗ merah di status checks dan tombol merge harus disabled.

## Catatan

- Bila Anda memakai GitHub Free (bukan Pro/Org), "Require status checks" tetap tersedia tapi limited. Pastikan akun Anda sudah set ke public repo atau upgrade bila perlu.
- "Code Owners" (`CODEOWNERS` file) opsional di MVP v1. Tambah bila tim membesar.
- Untuk solo dev, "1 approving review" bisa di-bypass dengan self-approval ( Anda approve PR sendiri) — tidak ideal tapi OK di MVP v1. Pertimbangkan untuk tetap jalankan manual review checklist di `docs/PR_SPRINT_1.md` meski self-approve.

## Branch protection untuk branch `sprint-*`

Opsional. Untuk MVP v1, branch `sprint-*` tidak perlu protection — fokus protection di `main` saja. Branch sprint bebas di-push tanpa PR antar-collaborator.

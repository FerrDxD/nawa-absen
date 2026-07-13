/**
 * Mengubah URL foto agar siap ditampilkan di browser (termasuk proxy untuk objek Cloudflare R2 bucket)
 */
export function resolvePhotoUrl(fotoUrl?: string | null, fotoBase64?: string | null): string {
	if (fotoUrl) {
		// Jika URL mengarah langsung ke endpoint S3 Cloudflare R2 (yang membutuhkan otentikasi server-side),
		// alihkan ke endpoint /api/photo supaya gambar bisa ditampilkan oleh browser
		if (fotoUrl.includes('r2.cloudflarestorage.com')) {
			return `/api/photo?url=${encodeURIComponent(fotoUrl)}`;
		}
		return fotoUrl;
	}
	return fotoBase64 || '';
}

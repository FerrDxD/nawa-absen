import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function getR2Client(): S3Client | null {
	if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
		return null;
	}
	return new S3Client({
		region: 'auto',
		endpoint: env.R2_ENDPOINT,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY
		}
	});
}

export const GET: RequestHandler = async ({ url }) => {
	const keyParam = url.searchParams.get('key');
	const urlParam = url.searchParams.get('url');

	let objectKey: string | null = keyParam;

	// Jika diberikan parameter url (contoh: dari record lama yang tersimpan sebagai URL lengkap r2.cloudflarestorage.com)
	if (!objectKey && urlParam) {
		const bucketName = env.R2_BUCKET_NAME || 'nawa-absen';
		try {
			const u = new URL(urlParam);
			const path = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
			if (path.startsWith(bucketName + '/')) {
				objectKey = path.slice(bucketName.length + 1);
			} else {
				objectKey = path;
			}
		} catch {
			objectKey = null;
		}
	}

	if (!objectKey) {
		throw error(400, 'Parameter key atau url foto diperlukan');
	}

	const r2Client = getR2Client();
	if (!r2Client || !env.R2_BUCKET_NAME) {
		throw error(500, 'Cloudflare R2 belum dikonfigurasi dengan benar di server');
	}

	try {
		const response = await r2Client.send(
			new GetObjectCommand({
				Bucket: env.R2_BUCKET_NAME,
				Key: objectKey
			})
		);

		if (!response.Body) {
			throw error(404, 'Foto tidak ditemukan di Cloudflare R2');
		}

		const byteArray = await response.Body.transformToByteArray();
		const contentType = response.ContentType || 'image/jpeg';

		return new Response(Buffer.from(byteArray), {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch (err: any) {
		console.error('Gagal mengambil foto dari Cloudflare R2:', err);
		throw error(404, 'Foto tidak ditemukan di storage R2');
	}
};

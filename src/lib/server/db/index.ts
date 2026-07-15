import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

export function getDb() {
	if (!env.DATABASE_URL) {
		return null;
	}

	// Gunakan koneksi lokal (postgres-js) jika URL tidak mengandung 'neon.tech'
	if (!env.DATABASE_URL.includes('neon.tech')) {
		const client = postgres(env.DATABASE_URL);
		return drizzlePg(client, { schema });
	}

	// Gunakan Neon HTTP serverless untuk production
	const client = neon(env.DATABASE_URL);
	return drizzleNeon(client, { schema });
}

export function isNeonConnected(): boolean {
	return Boolean(env.DATABASE_URL);
}

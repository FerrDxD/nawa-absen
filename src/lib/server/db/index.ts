import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

export function getDb() {
	if (!env.DATABASE_URL) {
		return null;
	}
	const client = neon(env.DATABASE_URL);
	return drizzle(client, { schema });
}

export function isNeonConnected(): boolean {
	return Boolean(env.DATABASE_URL);
}

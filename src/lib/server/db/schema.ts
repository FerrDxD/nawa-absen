import { pgTable, serial, text, doublePrecision, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const gugus = pgTable('gugus', {
	id: serial('id').primaryKey(),
	nama_gugus: text('nama_gugus').notNull().unique(),
	ruangan: text('ruangan').default('Ruang MPLS'),
	pembina: text('pembina').default('Kakak Pembina OSIS')
});

export const absensi = pgTable('absensi', {
	id: serial('id').primaryKey(),
	nama: text('nama').notNull(),
	gugus_id: integer('gugus_id').notNull().references(() => gugus.id),
	foto_url: text('foto_url'),
	foto_base64: text('foto_base64'),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	jarak_meter: doublePrecision('jarak_meter').notNull(),
	accuracy_meter: doublePrecision('accuracy_meter').notNull(),
	status: text('status').notNull().default('valid'), // 'valid' | 'ditolak_radius'
	keterangan: text('keterangan'),
	tanggal: text('tanggal').notNull(), // format YYYY-MM-DD untuk pencegahan double submission per hari
	user_agent: text('user_agent'),
	device_info: text('device_info'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const sekolah_config = pgTable('sekolah_config', {
	id: serial('id').primaryKey(),
	nama_sekolah: text('nama_sekolah').notNull().default('SMAN 2 Jonggol'),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	radius_meter: doublePrecision('radius_meter').notNull().default(70),
	max_accuracy_meter: doublePrecision('max_accuracy_meter').notNull().default(100),
	is_active: boolean('is_active').notNull().default(true),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

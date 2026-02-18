import { sql } from "@/db/postgresql";

export async function run_migrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          text primary key,
      email       text unique not null,
      created_at  timestamptz default now()
    )
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE media_type AS ENUM ('image', 'video');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE media_processing_status AS ENUM (
        'unprocessed', 'queued', 'processing', 'completed', 'failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_items (
      id                  uuid primary key default gen_random_uuid(),
      user_id             text not null references users(id) on delete cascade,
      file_path           text not null,
      file_name           text not null,
      mime_type           text not null,
      media_type          media_type not null,
      file_size           bigint,
      width               int,
      height              int,
      duration_secs       float,
      taken_at            timestamptz,
      is_vaulted          boolean not null default false,
      processing_status   media_processing_status not null default 'unprocessed',
      deleted_at          timestamptz,
      created_at          timestamptz default now(),
      updated_at          timestamptz default now(),
      unique(user_id, file_path)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS media_items_user_id_idx ON media_items(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_media_type_idx ON media_items(media_type)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_taken_at_idx ON media_items(taken_at)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_processing_status_idx ON media_items(processing_status)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_is_vaulted_idx ON media_items(is_vaulted)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_deleted_at_idx ON media_items(deleted_at)`;

  await sql`
    DO $$ BEGIN
      CREATE TYPE ai_status AS ENUM (
        'pending', 'processing', 'completed', 'failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_ai_data (
      id            uuid primary key default gen_random_uuid(),
      media_id      uuid not null references media_items(id) on delete cascade unique,
      description   text,
      tags          text[],
      status        ai_status not null default 'pending',
      error         text,
      attempts      int not null default 0,
      completed_at  timestamptz,
      created_at    timestamptz default now(),
      updated_at    timestamptz default now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS media_ai_data_status_idx ON media_ai_data(status)`;

  await sql`
    DO $$ BEGIN
      CREATE TYPE tag_source AS ENUM ('ai', 'manual');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id          uuid primary key default gen_random_uuid(),
      name        text not null unique,
      created_at  timestamptz default now(),
      updated_at  timestamptz default now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_tags (
      id          uuid primary key default gen_random_uuid(),
      media_id    uuid not null references media_items(id) on delete cascade,
      tag_id      uuid not null references tags(id) on delete cascade,
      source      tag_source not null default 'ai',
      created_at  timestamptz default now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS media_tags_media_id_idx ON media_tags(media_id)`;
  await sql`CREATE INDEX IF NOT EXISTS media_tags_tag_id_idx ON media_tags(tag_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS albums (
      id              uuid primary key default gen_random_uuid(),
      user_id         text not null references users(id) on delete cascade,
      name            text not null,
      description     text,
      cover_media_id  uuid references media_items(id) on delete set null,
      deleted_at      timestamptz,
      created_at      timestamptz default now(),
      updated_at      timestamptz default now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS album_media (
      album_id    uuid references albums(id) on delete cascade,
      media_id    uuid references media_items(id) on delete cascade,
      sort_order  int default 0,
      added_at    timestamptz default now(),
      primary key (album_id, media_id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS album_media_album_id_idx ON album_media(album_id)`;
  await sql`CREATE INDEX IF NOT EXISTS albums_deleted_at_idx ON albums(deleted_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id     text references users(id) on delete cascade,
      media_id    uuid references media_items(id) on delete cascade,
      created_at  timestamptz default now(),
      primary key (user_id, media_id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_vaults (
      user_id     text primary key references users(id) on delete cascade,
      pin_hash    text not null,
      is_enabled  boolean not null default true,
      created_at  timestamptz default now(),
      updated_at  timestamptz default now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS vault_sessions (
      id          uuid primary key default gen_random_uuid(),
      user_id     text not null references user_vaults(user_id) on delete cascade,
      token_hash  text not null,
      expires_at  timestamptz not null,
      created_at  timestamptz default now(),
      updated_at  timestamptz default now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS vault_sessions_user_id_idx ON vault_sessions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS vault_sessions_expires_at_idx ON vault_sessions(expires_at)`;

  await sql`ALTER TABLE media_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz`;
  await sql`ALTER TABLE albums ADD COLUMN IF NOT EXISTS deleted_at timestamptz`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_deleted_at_idx ON media_items(deleted_at)`;
  await sql`CREATE INDEX IF NOT EXISTS albums_deleted_at_idx ON albums(deleted_at)`;
}

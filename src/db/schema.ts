import { sql } from "@/db/postgresql";

export async function run_migrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          text primary key,
      email       text unique not null,
      name        text,
      device_info text,
      created_at  timestamptz default now()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete boolean not null default false`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS media_library_permission_granted boolean not null default false`;

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
      "user"              text not null references users(id) on delete cascade,
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
      unique("user", file_path)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS media_items_user_idx ON media_items("user")`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_media_type_idx ON media_items(media_type)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_taken_at_idx ON media_items(taken_at)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_processing_status_idx ON media_items(processing_status)`;
  await sql`CREATE INDEX IF NOT EXISTS media_items_is_vaulted_idx ON media_items(is_vaulted)`;

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
      id                      uuid primary key default gen_random_uuid(),
      media                   uuid not null references media_items(id) on delete cascade unique,
      media_type              media_type not null,
      description             text,
      tags                    text[],
      status                  ai_status not null default 'pending',
      error                   text,
      attempts                int not null default 0,
      completed_at            timestamptz,
      embedding_status        ai_status not null default 'pending',
      embedding_error         text,
      embedding_attempts      int not null default 0,
      embedding_completed_at  timestamptz,
      created_at              timestamptz default now(),
      updated_at              timestamptz default now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS media_ai_data_status_idx ON media_ai_data(status)`;
  await sql`CREATE INDEX IF NOT EXISTS media_ai_data_embedding_status_idx ON media_ai_data(embedding_status)`;

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
      media       uuid not null references media_items(id) on delete cascade,
      tag         uuid not null references tags(id) on delete cascade,
      source      tag_source not null default 'ai',
      created_at  timestamptz default now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS media_tags_media_idx ON media_tags(media)`;
  await sql`CREATE INDEX IF NOT EXISTS media_tags_tag_idx ON media_tags(tag)`;

  await sql`
    CREATE TABLE IF NOT EXISTS albums (
      id            uuid primary key default gen_random_uuid(),
      "user"        text not null references users(id) on delete cascade,
      name          text not null,
      description   text,
      cover_media   uuid references media_items(id) on delete set null,
      deleted_at    timestamptz,
      created_at    timestamptz default now(),
      updated_at    timestamptz default now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS album_media (
      id          uuid primary key default gen_random_uuid(),
      album       uuid not null references albums(id) on delete cascade,
      media       uuid not null references media_items(id) on delete cascade,
      sort_order  int default 0,
      added_at    timestamptz default now(),
      unique(album, media)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS album_media_album_idx ON album_media(album)`;

  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      id          uuid primary key default gen_random_uuid(),
      "user"      text not null references users(id) on delete cascade,
      media       uuid not null references media_items(id) on delete cascade,
      created_at  timestamptz default now(),
      unique("user", media)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites("user")`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_vaults (
      id          uuid primary key default gen_random_uuid(),
      "user"      text unique not null references users(id) on delete cascade,
      pin_hash    text not null,
      is_enabled  boolean not null default true,
      created_at  timestamptz default now(),
      updated_at  timestamptz default now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS vault_sessions (
      id          uuid primary key default gen_random_uuid(),
      "user"      text not null references users(id) on delete cascade,
      token_hash  text not null,
      expires_at  timestamptz not null,
      created_at  timestamptz default now(),
      updated_at  timestamptz default now()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS vault_sessions_user_idx ON vault_sessions("user")`;
  await sql`CREATE INDEX IF NOT EXISTS vault_sessions_expires_at_idx ON vault_sessions(expires_at)`;

  // Add media processing columns (idempotent)
  const media_columns = [
    { name: "thumbnail_path", type: "text" },
    { name: "placeholder_path", type: "text" },
    { name: "hls_dir", type: "text" },
    { name: "video_thumb_path", type: "text" },
    { name: "rotation", type: "int" },
    { name: "codec", type: "text" },
    { name: "error_message", type: "text" },
  ];

  for (const col of media_columns) {
    await sql.unsafe(
      `ALTER TABLE media_items ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
    );
  }
}

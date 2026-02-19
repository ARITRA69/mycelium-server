import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@/constants/env";

export const qdrant = new QdrantClient({ url: env.qdrant_url });

export const QDRANT_COLLECTIONS = {
  MEDIA_EMBEDDINGS: "media_embeddings",
} as const;

const NOMIC_EMBED_VECTOR_SIZE = 768;

export async function setup_qdrant_collections() {
  const existing = await qdrant.getCollections();
  const names = existing.collections.map((c) => c.name);

  if (!names.includes(QDRANT_COLLECTIONS.MEDIA_EMBEDDINGS)) {
    await qdrant.createCollection(QDRANT_COLLECTIONS.MEDIA_EMBEDDINGS, {
      vectors: {
        size: NOMIC_EMBED_VECTOR_SIZE,
        distance: "Cosine",
      },
    });
  }
}

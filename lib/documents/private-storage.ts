import { privateDocumentBlobAccess, privateDocumentStorageProvider } from "./blob";

/**
 * Storage port for private patrimonial documents.
 *
 * The domain never imports the provider SDK directly: the Vercel adapter is
 * one implementation, and the in-memory adapter lets the upload/download chain
 * be exercised without network access.
 */
export type StoredObject = Readonly<{
  key: string;
  byteSize: number;
  contentType: string;
}>;

export type StoredObjectStream = Readonly<{
  key: string;
  contentType: string;
  byteSize: number;
  stream: ReadableStream<Uint8Array>;
}>;

export type PrivateDocumentStorage = Readonly<{
  provider: string;
  put(input: { key: string; bytes: Uint8Array; contentType: string }): Promise<StoredObject>;
  open(key: string): Promise<StoredObjectStream | null>;
  remove(key: string): Promise<void>;
}>;

export function resolveBlobToken(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim();

  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN_REQUIRED");
  }

  return token;
}

/**
 * Vercel Blob adapter. Every call pins access to "private": no code path in
 * this repository can publish a patrimonial object, and no permanent public
 * URL is ever produced or persisted.
 */
export function createVercelPrivateBlobStorage(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): PrivateDocumentStorage {
  return {
    provider: privateDocumentStorageProvider,

    async put({ key, bytes, contentType }) {
      const { put } = await import("@vercel/blob");
      const result = await put(key, Buffer.from(bytes), {
        access: privateDocumentBlobAccess,
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType,
        token: resolveBlobToken(env),
      });

      return { key: result.pathname, byteSize: bytes.byteLength, contentType };
    },

    async open(key) {
      const { get } = await import("@vercel/blob");
      const result = await get(key, {
        access: privateDocumentBlobAccess,
        useCache: false,
        token: resolveBlobToken(env),
      });

      if (!result || result.statusCode !== 200) {
        return null;
      }

      return {
        key,
        contentType: result.blob.contentType,
        byteSize: result.blob.size,
        stream: result.stream,
      };
    },

    async remove(key) {
      const { del } = await import("@vercel/blob");
      await del(key, { token: resolveBlobToken(env) });
    },
  };
}

export type InMemoryPrivateDocumentStorage = PrivateDocumentStorage & Readonly<{
  keys(): readonly string[];
  bytesFor(key: string): Uint8Array | null;
}>;

/** Deterministic, network-free adapter for tests and local fixtures. */
export function createInMemoryPrivateDocumentStorage(): InMemoryPrivateDocumentStorage {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();

  return {
    provider: "in-memory-private",

    async put({ key, bytes, contentType }) {
      if (objects.has(key)) {
        throw new Error("DOCUMENT_BLOB_KEY_ALREADY_USED");
      }

      objects.set(key, { bytes: Uint8Array.from(bytes), contentType });
      return { key, byteSize: bytes.byteLength, contentType };
    },

    async open(key) {
      const stored = objects.get(key);

      if (!stored) {
        return null;
      }

      return {
        key,
        contentType: stored.contentType,
        byteSize: stored.bytes.byteLength,
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(Uint8Array.from(stored.bytes));
            controller.close();
          },
        }),
      };
    },

    async remove(key) {
      objects.delete(key);
    },

    keys() {
      return [...objects.keys()];
    },

    bytesFor(key) {
      const stored = objects.get(key);
      return stored ? Uint8Array.from(stored.bytes) : null;
    },
  };
}

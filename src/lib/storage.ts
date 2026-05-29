import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const requiredEnvVars = ["STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY", "STORAGE_BUCKET"] as const;
for (const key of requiredEnvVars) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

const client = new S3Client({
  region: process.env.STORAGE_REGION ?? "auto",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY as string,
    secretAccessKey: process.env.STORAGE_SECRET_KEY as string,
  },
});

const BUCKET = process.env.STORAGE_BUCKET as string;
const SIGNED_URL_EXPIRES_SECONDS = 3600;

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteFile(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_EXPIRES_SECONDS }
  );
}

export function buildStorageKey(
  category: "documents" | "images",
  id: string,
  filename: string
): string {
  return `${category}/${id}/${filename}`;
}

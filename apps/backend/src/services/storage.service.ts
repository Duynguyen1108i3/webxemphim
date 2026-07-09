import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

const s3 = new S3Client({ region: env.AWS_REGION });

export async function uploadMediaObject(input: { buffer: Buffer; mimeType: string; folder: "posters" | "trailers" | "masters" | "subtitles"; originalName: string }) {
  const extension = input.originalName.split(".").pop() ?? "bin";
  const key = `${input.folder}/${nanoid(16)}.${extension}`;
  await s3.send(new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: input.buffer,
    ContentType: input.mimeType,
    CacheControl: input.folder === "masters" ? "private, max-age=0" : "public, max-age=31536000, immutable"
  }));
  return { key, url: `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}` };
}

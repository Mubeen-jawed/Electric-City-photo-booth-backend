const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

// Create S3 client from env vars
function createS3Client() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "auto";
  const endpoint = process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT || undefined; // optional for S3-compatible providers
  const forcePathStyleEnv = process.env.AWS_S3_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE;
  const forcePathStyle = String(forcePathStyleEnv || "false").toLowerCase() === "true";

  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
  });
}

const s3 = createS3Client();

function buildObjectKey(prefix, originalName) {
  const safe = (originalName || "file").replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const ext = path.extname(safe);
  const id = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${prefix ? `${prefix.replace(/\/$/, "")}/` : ""}${id}${ext}`;
}

async function uploadBufferToS3({ buffer, bucket, key, contentType, acl }) {
  if (!bucket) throw new Error("Missing S3 bucket");
  if (!buffer) throw new Error("Missing buffer");
  if (!key) throw new Error("Missing S3 object key");

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
    ACL: acl || process.env.AWS_S3_ACL || "public-read",
  });
  await s3.send(cmd);

  // Build a public URL
  const baseUrl = process.env.AWS_S3_BASE_URL || process.env.R2_PUBLIC_BASE; // e.g., R2 public base or CDN
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${key}`;
  }

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const provider = (process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT || "").trim();
  if (provider) {
    // Custom endpoint
    return `${provider.replace(/\/$/, "")}/${bucket}/${key}`;
  }
  // Default AWS URL (virtual-hosted-style)
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function deleteFromS3({ bucket, key }) {
  if (!bucket || !key) return;
  try {
    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await s3.send(cmd);
  } catch (e) {
    // best-effort deletion
  }
}

module.exports = {
  s3,
  buildObjectKey,
  uploadBufferToS3,
  deleteFromS3,
};



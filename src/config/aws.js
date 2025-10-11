import { S3Client } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

dotenv.config();

// AWS S3 Configuration
const s3BucketName = process.env.S3_BUCKET_NAME;
const s3BucketSecretAccessKey = process.env.S3_BUCKET_SECRET_ACCESS_KEY;
const s3BucketAccessKeyId = process.env.S3_BUCKET_ACCESS_KEY;
const s3BucketRegion = process.env.S3_BUCKET_REGION;


const s3 = new S3Client({
  region: s3BucketRegion,
  credentials: {
    accessKeyId: s3BucketAccessKeyId,
    secretAccessKey: s3BucketSecretAccessKey,
  },
});

export {
  s3BucketName,
  s3BucketSecretAccessKey,
  s3BucketAccessKeyId,
  s3BucketRegion,
  s3,
};
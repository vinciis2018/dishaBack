import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";
import { s3, s3BucketName, s3BucketRegion } from "../config/aws.js";

/**
 * Generate a pre-signed URL for downloading a file from S3
 * @param {string} key - The S3 object key (file path)
 * @returns {Promise<string>} - The pre-signed URL
 */
export const getObject = async (key) => {
  // Make sure the key doesn't contain the full URL or bucket name
  // Remove any existing URL parts from the key if present
  const cleanKey = key.replace(/^https?:\/\/[^\/]+\//, '');
  
  const command = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: cleanKey,
  });
  
  // Generate a URL that expires in 1 hour (3600 seconds)
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return url;
}

/**
 * Generate a pre-signed URL for uploading a file to S3
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getS3UploadUrl = async (req, res) => {
  try {
    const { contentType, name } = req.body;
    if (!contentType) {
      return res.status(400).send({ message: "Content type is required" });
    }

    // Generate a unique file name
    const fileExtension = contentType.split("/")[1] || '';
    const id = new mongoose.Types.ObjectId();
    const fileName = name ? `${id}_${name}` : `${id}${fileExtension ? `.${fileExtension}` : ''}`;

    // Create the S3 command
    const command = new PutObjectCommand({
      Bucket: s3BucketName,
      Key: fileName,
      ContentType: contentType,
    });

    // Generate a pre-signed URL that expires in 1 hour
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const awsURL = `https://${s3BucketName}.s3.${s3BucketRegion}.amazonaws.com/${fileName}`;

    return res.status(200).json({ 
      success: true,
      data: { 
        uploadUrl: url, 
        url: awsURL,
        fileName,
        key: fileName
      } 
    });
  } catch (error) {
    console.error("Error generating S3 upload URL:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to generate upload URL",
      error: error.message 
    });
  }
};

/**
 * Generate a pre-signed URL for uploading a file to S3 with a specific file name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const uploadOnS3 = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ 
        success: false,
        message: "File name and type are required" 
      });
    }

    const command = new PutObjectCommand({
      Bucket: s3BucketName,
      Key: fileName,
      ContentType: fileType,
    });

    // Generate a pre-signed URL that expires in 1 hour
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const awsURL = `https://${s3BucketName}.s3.${s3BucketRegion}.amazonaws.com/${fileName}`;

    return res.status(200).json({ 
      success: true,
      data: { 
        uploadUrl: url, 
        fileUrl: awsURL,
        fileName,
        key: fileName
      } 
    });
  } catch (error) {
    console.error("Error generating S3 upload URL:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to generate upload URL",
      error: error.message 
    });
  }
};

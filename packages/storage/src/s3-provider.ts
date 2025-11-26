import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  ListOptions,
  ListResult,
  MultipartUploadPart,
  StorageConfig,
  StorageProvider,
  UploadOptions,
} from "./types";

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array | string | ReadableStream,
    options?: UploadOptions
  ): Promise<string> {
    // Use lib-storage Upload for efficient streaming uploads
    const parallelUploads3 = new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: key,
        Body: data,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      },
    });

    await parallelUploads3.done();

    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async deleteMany(keys: string[]): Promise<void> {
    const command = new DeleteObjectsCommand({
      Bucket: this.config.bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    });

    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  getUrl(key: string): string {
    if (this.config.publicUrl) {
      const baseUrl = this.config.publicUrl.replace(/\/$/g, "");
      const cleanKey = key.replace(/^\//g, "");
      return `${baseUrl}/${cleanKey}`;
    }

    if (this.config.endpoint) {
      const baseUrl = this.config.endpoint.replace(/\/$/g, "");
      const cleanKey = key.replace(/^\//g, "");
      return `${baseUrl}/${this.config.bucket}/${cleanKey}`;
    }

    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if (
        (error as Error).name === "NotFound" ||
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.config.bucket,
      CopySource: `${this.config.bucket}/${sourceKey}`,
      Key: destinationKey,
    });
    await this.client.send(command);
  }

  async list(prefix?: string, options?: ListOptions): Promise<ListResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.config.bucket,
      Prefix: prefix,
      MaxKeys: options?.limit,
      ContinuationToken: options?.cursor,
      Delimiter: options?.delimiter,
    });

    const response = await this.client.send(command);

    return {
      objects:
        response.Contents?.map((obj) => ({
          key: obj.Key ?? "",
          lastModified: obj.LastModified,
          size: obj.Size,
          eTag: obj.ETag,
        })) || [],
      nextCursor: response.NextContinuationToken,
      commonPrefixes: response.CommonPrefixes?.map(
        (p) => p.Prefix ?? ""
      ).filter(Boolean),
    };
  }

  // Multipart Upload Primitives

  async createMultipartUpload(
    key: string,
    options?: UploadOptions
  ): Promise<string> {
    const command = new CreateMultipartUploadCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
    });

    const response = await this.client.send(command);
    return response.UploadId ?? "";
  }

  async signPartUpload(
    key: string,
    uploadId: string,
    partNumber: number
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: this.config.bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: MultipartUploadPart[]
  ): Promise<void> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: this.config.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });

    await this.client.send(command);
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: this.config.bucket,
      Key: key,
      UploadId: uploadId,
    });

    await this.client.send(command);
  }
}

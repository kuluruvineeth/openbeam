import { S3StorageProvider, StorageConfigSchema } from "../src";

const config = {
  region: "us-east-1",
  accessKeyId: "test",
  secretAccessKey: "test",
  bucket: "test-bucket",
  endpoint: "http://localhost:9000",
};

async function runVerification() {
  try {
    const parsedConfig = StorageConfigSchema.parse(config);
    const provider = new S3StorageProvider(parsedConfig);
    console.log("Storage provider initialized successfully");

    // Test URL generation
    console.log("URL for key 'test.txt':", provider.getUrl("test.txt"));

    // Test existence check (will likely fail or return false without real backend)
    try {
      const exists = await provider.exists("test.txt");
      console.log("Exists check:", exists);
    } catch (e) {
      console.log("Exists check failed as expected (no backend):", e.message);
    }

    // Test Multipart Upload Flow (Mocking/Dry run)
    // We can't really test this without a backend, but we can verify the method signatures match
    console.log(
      "Multipart upload methods available:",
      typeof provider.createMultipartUpload === "function",
      typeof provider.signPartUpload === "function",
      typeof provider.completeMultipartUpload === "function"
    );

    console.log("Verification script completed.");
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

runVerification();

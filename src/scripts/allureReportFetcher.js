import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";
import dotenv from "dotenv";

// Load environment variables for Node.js
dotenv.config();

// Get environment variables with fallbacks
const AWS_REGION = process.env.VITE_AWS_REGION || process.env.AWS_REGION || 'eu-north-1';
const AWS_ACCESS_KEY = process.env.VITE_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.VITE_AWS_SECRET_KEY || process.env.AWS_SECRET_KEY;
const BUCKET_NAME = process.env.VITE_S3_BUCKET || process.env.S3_BUCKET || "allure-report-telephony";


if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY) {
  console.error('Missing AWS credentials!');
  console.error('Please check your .env file has:');
  console.error('VITE_AWS_ACCESS_KEY=your-key');
  console.error('VITE_AWS_SECRET_KEY=your-secret');
  throw new Error('AWS credentials not configured');
}

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

// Helper to stream -> string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

// Fetch all runs + summary for each
async function listAllReports() {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "reports/allure-results-",
    Delimiter: "/",
  });
  const res = await s3Client.send(command);

  const runIds =
    res.CommonPrefixes?.map((p) =>
      p.Prefix.replace("reports/", "").replace(/\/$/, "")
    ) || [];

  console.log("Found runs:", runIds);

  // Fetch summaries for each run
  const reports = [];
  for (const runId of runIds) {
    const summary = await fetchSummary(runId);
    reports.push({ runId, summary });
  }

  return reports;
}

// Reuse your fetchSummary logic
async function fetchSummary(execId) {
  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `reports/${execId}/`,
    MaxKeys: 1000,
  });

  const listResult = await s3Client.send(listCommand);

  const resultFiles =
    listResult.Contents?.filter((obj) => obj.Key.endsWith("-result.json")) || [];

  if (!resultFiles.length) {
    return {
      statistic: { total: 0, passed: 0, failed: 0, broken: 0, skipped: 0 },
      time: { start: null, stop: null },
      totalFiles: 0,
    };
  }

  const results = await Promise.all(
    resultFiles.map(async (file) => {
      try {
        const res = await s3Client.send(
          new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: file.Key,
          })
        );
        return JSON.parse(await streamToString(res.Body));
      } catch {
        return null;
      }
    })
  );

  const cleanResults = results.filter(Boolean);

  return {
    statistic: {
      total: cleanResults.length,
      passed: cleanResults.filter((r) => r.status === "passed").length,
      failed: cleanResults.filter((r) => r.status === "failed").length,
      broken: cleanResults.filter((r) => r.status === "broken").length,
      skipped: cleanResults.filter((r) => r.status === "skipped").length,
    },
    time: {
      start: Math.min(...cleanResults.map((r) => r.start || Date.now())),
      stop: Math.max(...cleanResults.map((r) => r.stop || Date.now())),
    },
    totalFiles: resultFiles.length,
  };
}

export { listAllReports };
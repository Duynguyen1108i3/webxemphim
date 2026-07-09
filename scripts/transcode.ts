import { transcodeToAdaptiveStreaming } from "../apps/backend/src/jobs/video-processing.js";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: npm exec tsx scripts/transcode.ts <input-video> <output-dir>");
  process.exit(1);
}

await transcodeToAdaptiveStreaming(input, output);

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export async function transcodeToAdaptiveStreaming(inputPath: string, outputDir: string) {
  await mkdir(outputDir, { recursive: true });
  const hls = path.join(outputDir, "master.m3u8");
  const dash = path.join(outputDir, "manifest.mpd");
  await run("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-filter_complex", "[0:v]split=3[v1][v2][v3];[v1]scale=w=1920:h=1080[v1out];[v2]scale=w=1280:h=720[v2out];[v3]scale=w=854:h=480[v3out]",
    "-map", "[v1out]", "-map", "0:a:0", "-c:v:0", "h264", "-b:v:0", "5800k", "-c:a:0", "aac", "-b:a:0", "192k",
    "-map", "[v2out]", "-map", "0:a:0", "-c:v:1", "h264", "-b:v:1", "3000k", "-c:a:1", "aac", "-b:a:1", "128k",
    "-map", "[v3out]", "-map", "0:a:0", "-c:v:2", "h264", "-b:v:2", "1400k", "-c:a:2", "aac", "-b:a:2", "96k",
    "-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod",
    "-master_pl_name", "master.m3u8", "-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2",
    path.join(outputDir, "variant_%v.m3u8")
  ]);
  await run("ffmpeg", ["-y", "-i", inputPath, "-map", "0", "-c:v", "h264", "-c:a", "aac", "-f", "dash", dash]);
  return { hls, dash };
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

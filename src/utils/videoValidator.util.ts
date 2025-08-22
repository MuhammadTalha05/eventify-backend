import ffmpeg from "fluent-ffmpeg";

export async function validateVideoDuration(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata.format.duration ?? 0;
      resolve(duration <= 30); // ✅ 30 seconds max
    });
  });
}
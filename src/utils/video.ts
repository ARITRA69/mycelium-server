import ffmpeg from "fluent-ffmpeg";

export function probe_video(file_path: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file_path, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

export type TVideoMetadata = {
  width: number | null;
  height: number | null;
  codec: string | null;
  rotation: number | null;
  duration_secs: number | null;
};

export function extract_video_metadata({
  probe_data,
}: {
  probe_data: ffmpeg.FfprobeData;
}): TVideoMetadata {
  const video_stream = probe_data.streams.find(
    (s) => s.codec_type === "video"
  );

  let width: number | null = null;
  let height: number | null = null;
  let codec: string | null = null;
  let rotation: number | null = null;

  if (video_stream) {
    width = video_stream.width ?? null;
    height = video_stream.height ?? null;
    codec = video_stream.codec_name ?? null;

    const rotate_tag =
      video_stream.tags?.rotate ??
      (
        video_stream.side_data_list as
          | Array<{ rotation?: number }>
          | undefined
      )
        ?.find((sd) => sd.rotation !== undefined)
        ?.rotation?.toString();

    rotation = rotate_tag ? parseInt(rotate_tag, 10) : null;
  }

  const duration_secs =
    probe_data.format.duration !== undefined
      ? probe_data.format.duration
      : null;

  return { width, height, codec, rotation, duration_secs };
}

import fs from "fs";
import Throttle from "throttle";
import { Song } from "../Database/Song.js";
import { Writable } from "stream";
import ffprobe, { FFProbeResult } from "ffprobe";
import ffprobeStatic from "ffprobe-static";

export class MediaController {
  currentSong: Song | null = null;
  queue: Song[] = [];
  length = 0;
  lastStat: FFProbeResult | null = null;
  sample_rate: number = 48000;

  stream: Writable = new Writable({
    write(chunk: any, encoding, callback) {},
  });

  async playSong(path: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const info = await ffprobe(path, {
        path: ffprobeStatic.path,
      });

      this.lastStat = info;
      this.sample_rate = info.streams[0].sample_rate ??= 48000;
      this.length = info.streams[0].duration ??= 0;

      resolve(fs.readFileSync(path));

      //   console.log(this.sample_rate);
      //   const throttle = new Throttle({
      //     bps: this.sample_rate,
      //     chunkSize: this.sample_rate * 8,
      //   });

      //   resolve(fs.createReadStream(path).pipe(throttle));
    });
  }
}

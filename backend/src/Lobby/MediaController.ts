import fs from "fs";
import Throttle from "throttle";
import { Song } from "../Database/Song.js";
import { Writable } from "stream";
import ffprobe, { FFProbeResult } from "ffprobe";
import ffprobeStatic from "ffprobe-static";

export class MediaController {
    currentSong: Song | null = null;
    queue: Song[] = [];
    lastStat: FFProbeResult | null = null;
    
    stream: Writable = new Writable({
        write(chunk: any, encoding, callback) {

        }
    });
    
    async playSong(path: string): Promise<Throttle | null> {
        return new Promise(async (resolve, reject) => {
            const info = await ffprobe(path, {
                path: ffprobeStatic.path
            })

            this.lastStat = info;
    
            const bitRate = info.streams[0].bit_rate ??= 128000;
            console.log(bitRate)
            const throttle = new Throttle(bitRate / 8);
    
            resolve(fs.createReadStream(path).pipe(throttle))
            // .on("data", (chunk) => {
            //     this.stream.write(chunk);
            // })
        })
    }
}
import PocketBase from "pocketbase";
import { Song } from "./Song.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(import.meta.url).split("file://")[1];

export class Database extends PocketBase {

    constructor(url: string) {
        super(url)
    }

    async requestSong(options?: filterOptions): Promise<Song> {
        // add options
        return new Promise(async (resolve, reject) => {
            const result = await this.collection('songs').getList(1, 1, { sort: "@random" });
            if(result.totalItems !== 0) {
                //const song = Song.fromDB(result.items[0])
                const res = result.items[0];
                return resolve(
                    new Song(
                        res.artist,
                        res.title,
                        res.year,
                        __dirname + "/../../database/songs/" + res.filepath,
                        res.game,
                        res.anime)
                    );
            } else {
                return reject("no song found")
            }
        })
    }
}

interface filterOptions {

}
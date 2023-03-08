import PocketBase, { ListQueryParams } from "pocketbase";
import { Song } from "./Song.js";
import { fileURLToPath } from "url";
import path from "path";
import { User } from "../User/User.js";
import { UserRecord } from "./UserRecord.js";
import { DatabaseUser } from "./User.js";
import bcrypt from "bcrypt";

const __dirname = path.dirname(import.meta.url).split("file://")[1];

export class Database extends PocketBase {
  constructor(url: string, public SALT_ROUNDS: number) {
    super(url);
  }

  hash(input: string) {
    return bcrypt.hash(input, this.SALT_ROUNDS);
  }

  async comparePasswords(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.hash(plainPassword).then((hash) => {
        if (hash === hashedPassword) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  //   async getUserByName(name: string): Promise<DatabaseUser> {
  //     return new Promise(async (resolve, reject) => {
  //         this.collection("users").
  //     })
  //   }

  //   async getUserById(id: string): Promise<DatabaseUser> {
  //     return new Promise(async (resolve, reject) => {
  //       this.collection("users")
  //         .getOne(id)
  //         .then((record) => {
  //           const userRecord = record as UserRecord;
  //           if (userRecord) {
  //             const user: DatabaseUser = {
  //               username: userRecord.username,
  //               id: userRecord.id,
  //               email: userRecord.email,
  //               verified: userRecord.verified,
  //               created: new Date(userRecord.created).getTime(),
  //               updated: new Date(userRecord.updated).getTime(),
  //               avatar: userRecord.avatar,
  //             };
  //             resolve(user);
  //           } else {
  //             reject("User not found!");
  //           }
  //         });
  //     });
  //   }

  async requestSong(
    prevMedia: keyof Song,
    prevMediaTitle: string,
    options?: string[]
  ): Promise<Song> {
    // add options
    let filter: ListQueryParams["filter"] = "";

    if (prevMedia) {
      filter = `${prevMedia} != '${prevMediaTitle}'`;
    }

    return new Promise(async (resolve, reject) => {
      const result = await this.collection("songs").getList(1, 1, {
        sort: "@random",
        filter: options?.join(" && "),
      });
      if (result.totalItems !== 0) {
        //const song = Song.fromDB(result.items[0])
        const res = result.items[0];
        return resolve({
          artist: res.artist,
          title: res.title,
          year: res.year,
          path: __dirname + "/../../database/songs/" + res.filepath,
          game: res.game,
          anime: res.anime,
        });
      } else {
        return reject("no song found");
      }
    });
  }
}

interface filterOptions {}

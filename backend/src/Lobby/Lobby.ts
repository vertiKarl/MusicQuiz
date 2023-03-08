import { User } from "../User/User.js";
import Answer from "./Answer.js";
import { Song } from "../Database/Song.js";
import {
  LobbyController,
  SocketMessage,
  UserSocket,
} from "./LobbyController.js";
import LobbyOptions from "./LobbyOptions.js";
import { MediaController } from "./MediaController.js";
import Message from "./Message.js";
import { LobbyStatus } from "./LobbyStatus.js";
import togglePause from "./HostCommands.ts/togglePause.js";
import changeOption from "./HostCommands.ts/changeOption.js";
import transferHost from "./HostCommands.ts/transferHost.js";

type Event = "ROUND_START" | "ROUND_END" | "AUDIO_BUFFER";

// const ROUND_TIME = 60 /* seconds */ * 1000; /* milliseconds */

export class Lobby {
  static controller: LobbyController;
  status: LobbyStatus = LobbyStatus.IDLE;
  players: Map<string, UserSocket> = new Map();
  controller: MediaController;
  round: number = 0;
  answers = new Map<string, Answer>();
  roundScore = new Map<string, number>();
  totalScore = new Map<string, number>();
  songHistory: Song[] = [];

  _host: UserSocket | undefined;

  isPaused = false;

  constructor(public id: string, public options: LobbyOptions) {
    this.controller = new MediaController();
    setTimeout(() => {
      this.startRound();
    }, options.ROUND_TIME / 4);

    // setInterval(() => {
    //     this.startRound();
    // }, ROUND_TIME);
  }

  set host(host: UserSocket) {
    console.debug(
      "SETTING HOST",
      host.user.username,
      "OLD_HOST?",
      !!this._host
    );
    // remove old host
    if (this._host) {
      this._host.socket.off("TOGGLE_PAUSE", () => {
        togglePause(this);
      });
      this._host.socket.off(
        "CHANGE_OPTION",
        (key: keyof LobbyOptions, value) => {
          changeOption(this, key, value);
        }
      );
      this._host.socket.off("HOST_TRANSFER", (user: User) => {
        transferHost(this, user);
      });
    }

    this._host = host;
    Lobby.controller.to(this.id).emit("HOST_TRANSFER", host.user.id);

    host.socket.on("TOGGLE_PAUSE", () => {
      togglePause(this);
    });

    host.socket.on("CHANGE_OPTION", (key: keyof LobbyOptions, value) => {
      changeOption(this, key, value);
    });

    host.socket.on("HOST_TRANSFER", (user: User) => {
      transferHost(this, user);
    });
  }

  get host(): UserSocket {
    if (!this._host) {
      this._host = this.players.values().next().value;
    }
    return this._host!;
  }

  log(...content: any[]) {
    if (typeof content[0] === "string" && content.length === 1) {
      console.log(`Lobby[${this.id}](${this.players.size})`, content[0]);
    } else {
      console.log(`Lobby[${this.id}]`, content);
    }
  }

  sendMsg(...content: any[]) {
    this.log(content);
    Lobby.controller.to(this.id).emit("MESSAGE", { content });
  }

  joinPlayer(us: UserSocket) {
    // set lobby property of user
    us.lobby = this;

    // announce user in lobby
    us.socket.to(this.id).emit("USER_JOIN", us.user);

    // declare host
    if (
      this.players.size === 0 ||
      !this._host ||
      this._host.socket.disconnected
    ) {
      this.host = us;
    }

    // add to players
    this.players.set(us.user.id, us);
    console.debug(this.players.keys());

    // tell user which players are connected
    us.socket.emit(
      "USER_LIST",
      Array.from(this.players.values()).map((uSock) => {
        return uSock.user;
      })
    );

    us.socket.on("MESSAGE", (message: Message) => {
      this.handleMessage(message, us);
    });
  }

  leavePlayer(us: UserSocket, reason: any) {
    this.sendMsg(`${us.user.username} left.`);
    this.log(`(${us.user.username}) left. => Reason ${reason}`);

    us.socket.to(this.id).emit("USER_LEAVE", us.user);

    us.socket.off("MESSAGE", (message: Message) => {
      this.handleMessage(message, us);
    });

    this.players.delete(us.user.id);
  }

  registerAnswer(user: User, text: string) {
    if (!this.controller?.currentSong) return;
    let answer = this.answers.get(user.id);
    if (!answer) {
      answer = { user, guesses: [], points: 0 };
    } else if (answer.guesses.includes(text)) return;

    answer.guesses.push(text);

    console.debug("ANSWER", answer);

    console.debug("ALLOWED_LIST", this.options.ALLOWED);

    let max_points = 0;
    for (const property of this.options.ALLOWED) {
      if (this.controller.currentSong[property]) max_points++;
    }

    for (const property of this.options.ALLOWED) {
      console.debug(
        "PROPERTY",
        property,
        this.controller.currentSong[property]
      );
      if (
        text.toLowerCase() ===
        this.controller.currentSong[property]?.toString().toLowerCase()
      ) {
        this.players.get(user.id)?.socket.emit("ANSWER_RIGHT", {
          type: property,
          points: ++answer.points,
          max_points,
        });
      }
    }

    this.answers.set(answer.user.id, answer);
    this.roundScore.set(user.id, answer.points);

    console.debug("ANSWER_WITH_POINTS", answer);
  }

  handleMessage(message: Message, us: UserSocket) {
    us.socket.to(this.id).emit("MESSAGE", message);

    this.log(`[Message] ${us.user.username}: ${message.content}`);
  }

  async startRound() {
    if (this.songHistory.length > 30) {
      this.songHistory.splice(0, 1);
    }
    this.answers = new Map();

    for (const us of this.players.values()) {
      if (!this.roundScore.get(us.user.id)) this.roundScore.set(us.user.id, 0);

      us.socket.on("ANSWER", (user: User, text: string) => {
        this.registerAnswer(user, text);
      });
    }

    const previousSong = this.songHistory[this.songHistory.length - 1];

    let media: keyof Song = "artist";
    let title: string = "";

    if (previousSong) {
      if (previousSong.anime) {
        media = "anime";
        title = previousSong.anime;
      } else if (previousSong.game) {
        media = "game";
        title = previousSong.game;
      }
    }

    const filter = [`${media} != '${title}'`];

    if (!this.options.ALLOWED.includes("anime")) {
      filter.push(`anime ~ ''`);
    }

    if (!this.options.ALLOWED.includes("game")) {
      filter.push("game ~ ''");
    }

    const song = await Lobby.controller.db.requestSong(media, title, filter);

    this.songHistory.push(song);
    this.log(
      `Round ${this.round} started. Song: ${song.artist} - ${song.title}`
    );
    this.controller.currentSong = song;

    const buffer = await this.controller.playSong(song.path);

    if (buffer) {
      Lobby.controller.to(this.id).emit("AUDIO_FILE", buffer);
      // console.log("STREAMING", this.streamer.sample_rate);
      // stream.on("data", (chunk) => {
      //   console.count("buffers");
      //   Lobby.controller
      //     .to(this.id)
      //     .emit("AUDIO_BUFFER", chunk, this.streamer.sample_rate);
      // });
    } else {
      console.log("buffer UNDEFINED");
    }

    // try to prevent race condition
    setTimeout(() => {
      Lobby.controller
        .to(this.id)
        .emit(
          "ROUND_START",
          Math.random() *
            (this.controller.length - this.options.ROUND_TIME / 1000)
        );
      this.status = LobbyStatus.INPROGRESS;

      // play song
      setTimeout(() => {
        // reveal song, stop submissions
        this.endRound();
      }, this.options.ROUND_TIME / 2);
    }, 1000);
  }

  endRound() {
    for (const us of this.players.values()) {
      const prevScore = this.totalScore.get(us.user.id) || 0;

      console.debug(prevScore);

      this.totalScore.set(
        us.user.id,
        prevScore + (this.roundScore.get(us.user.id) || 0)
      );

      us.socket.off("ANSWER", (user: User, text: string) => {
        this.registerAnswer(user, text);
      });
    }

    console.debug(this.roundScore);
    console.debug(this.totalScore);

    Lobby.controller
      .to(this.id)
      .emit(
        "ROUND_END",
        Object.fromEntries(this.totalScore),
        this.controller.currentSong
      );
    this.status = LobbyStatus.IDLE;
    this.round++;

    setTimeout(() => {
      if (!this.isPaused) this.startRound();
    }, this.options.ROUND_TIME / 4);
  }
}

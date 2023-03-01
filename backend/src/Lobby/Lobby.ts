import { User } from "../User/User.js";
import { LobbyController, SocketMessage, UserSocket } from "./LobbyController.js";
import { MediaController } from "./MediaController.js";

enum LobbyStatus {
    IDLE, INPROGRESS
}

const ROUND_TIME = 30 /* seconds */ * 1000 /* milliseconds */;

export class Lobby {
    static controller: LobbyController;
    status: LobbyStatus = LobbyStatus.IDLE;
    players: Map<string, UserSocket> = new Map();
    streamer: MediaController = new MediaController();
    round: number = 0;
    systemUser: User;

    constructor(public id: string) {
        this.systemUser = new User(`Lobby${this.id}`, this.id);

        //this.startRound();

        // setInterval(() => {
        //     this.startRound();
        // }, ROUND_TIME);
    }

    broadcast(message: SocketMessage) {
        Lobby.controller.broadcast(Array.from(this.players.values()), message)
    }
    
    async startRound() {
        const song = await Lobby.controller.db.requestSong();
        console.debug("TEST:",song)
        const stream = await this.streamer.playSong(song.path);

        if(stream) {
            console.log("STREAMING")
            // stream.on('data', (chunk) => {
            //     const data: SocketMessage = {type: 'AUD', user: this.systemUser, content: chunk, stat: this.streamer.lastStat}
            //     this.broadcast(data);
            // })
        } else {
            console.log("STREAM UNDEFINED")
        }
        

        const message: SocketMessage = {type: 'MSG', user: this.systemUser, content: `Round ${this.round} starting!`, isBroadcast: true}
        this.broadcast(message)

        this.streamer.stream


        const _this = this;

        _this.status = LobbyStatus.INPROGRESS;
        // play song
        setTimeout(() => {
            // reveal song, stop submissions
            _this.endRound();
        }, 15 * 1000)
    };

    endRound() {
        this.broadcast({type: 'MSG', user: this.systemUser, content: `Round ${this.round} ended`, isBroadcast: true});
        LobbyStatus.IDLE;
        this.round++;
    }
}
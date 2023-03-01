import { ChatMessage } from "../Chat/ChatMessage.js";
import { MediaController } from "./MediaController.js";
import { v4 as uuid } from "uuid";
import { User } from "../User/User.js";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import { Lobby } from "./Lobby.js";
import { Config } from "../config.js";
import { Database } from "../Database/DatabaseController.js";
import { Writable } from "stream";
import { FFProbeResult } from "ffprobe";

export interface UserSocket extends WebSocket {
    id: string,
    lobbyId: string,
    user: User,
    sink: Writable
}

export interface SocketMessage {
    type: 'MSG' | 'CHN' | 'PING' | 'AUD' | 'UserJoin' | 'UserList' | 'UserLeave',
    content?: string,
    stat?: FFProbeResult | null,
    user: User,
    userList?: User[],
    isBroadcast: boolean
}

const defaultLobbies = ["test"]

export class LobbyController {
    //sockets: Map<string, UserSocket[]> = new Map();
    lobbies: Map<string, Lobby> = new Map();
    db: Database;
    wss: WebSocketServer;

    systemUser: User = new User("SYSTEM", "0");

    constructor(CONFIG: Config) {
        const app = express();
        const server = http.createServer(app);
        
        this.wss = new WebSocketServer({ server });

        this.db = new Database(CONFIG.DATABASE_URL);
        const _this = this;
        Lobby.controller = this;

        defaultLobbies.forEach(id => {
            this.lobbies.set(id, new Lobby(id));
        })

        this.wss.on('connection', (ws: UserSocket): void => {
            
            ws.id = uuid();
            ws.user = new User(ws.id, ws.id); // TODO: Check Login
            ws.lobbyId = "test";
            
            console.log(ws.user.name + " joined!")
            // Announce User in Lobby

            
            if(!this.lobbies.get(ws.lobbyId)) this.lobbies.set(ws.lobbyId, new Lobby(ws.lobbyId));
            
            // const socket = new UserSocket(ws, lobbyID, user);
            this.broadcast(Array.from(this.lobbies.get(ws.lobbyId)!.players.values()), {
                type: "UserJoin",
                user: ws.user,
                isBroadcast: true
            })
            
            this.lobbies.get(ws.lobbyId)!.players.set(ws.id, ws);

            const UserList: SocketMessage = {
                type: "UserList",
                user: this.systemUser,
                isBroadcast: false,
                userList: Array.from(this.lobbies.get(ws.lobbyId)!.players.values()).map((uSock) => {
                    return uSock.user;
                })
            }

            ws.send(JSON.stringify(UserList));


            ws.on('message', (data: string) => {
                const msg: SocketMessage = JSON.parse(data);
                console.log(msg)
                msg.user = ws.user;

                switch(msg.type) {
                    case "MSG":
                        _this.broadcast(Array.from(this.lobbies.get(ws.lobbyId)!.players.values()), msg);
                        console.log("MSG:", ws.user.name, msg.content);
                        break;
                    case "CHN":
                        if(msg.content) ws.user.name = msg.content;
                        _this.broadcast(Array.from(this.lobbies.get(ws.lobbyId)!.players.values()), 
                            {
                                type: "CHN",
                                user: ws.user,
                                isBroadcast: true
                            }
                        )
                        break;
                    case "PING":
                        ws.send(JSON.stringify({
                            "type": "PING",
                            "ms": new Date().getTime(),
                            "user": this.systemUser
                        }));
                        break;
                }
            })

            ws.on('close', (code, reason) => {
                console.log(`Socket(${ws.id}) closed with code ${code}. => Reason ${reason}`);
                this.broadcast(Array.from(this.lobbies.get(ws.lobbyId)!.players.values()), {
                    type: "UserLeave",
                    user: ws.user,
                    isBroadcast: true
                });
                
                const lobby = this.lobbies.get(ws.lobbyId)!.players;
                lobby.delete(ws.id);
            })
        })

        server.listen(8080, () => {
            console.log("WebSocketServer ready!")
        })
    }

    broadcast(listOfSockets: UserSocket[], data: SocketMessage) {
        for(const socket of listOfSockets) {
            socket.send(JSON.stringify(data))
        }
    }

    joinLobby(socket: WebSocket) {

    }
}
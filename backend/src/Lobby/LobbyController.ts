import { ChatMessage } from "../Chat/ChatMessage.js";
import { MediaController } from "./MediaController.js";
import { v4 as uuid } from "uuid";
import { User } from "../User/User.js";
import http from "http";
import { Server as WebSocketServer, Socket } from "socket.io";
import express from "express";
import { Lobby } from "./Lobby.js";
import { Config } from "../config.js";
import { Database } from "../Database/DatabaseController.js";
import { Writable } from "stream";
import { FFProbeResult } from "ffprobe";
import { UserRecord } from "../Database/UserRecord.js";
import LobbyOptions from "./LobbyOptions.js";
import { RecordAuthResponse } from "pocketbase";
import Message from "./Message.js";

const defaultLobbySettings: LobbyOptions = {
  MAX_PLAYERS: 8,
  ROUND_TIME: 60 * 1000,
  ALLOWED: ["anime", "artist", "game", "title", "year"],
};

export interface UserSocket {
  lobby: Lobby;
  user: User;
  socket: Socket;
}

type Events =
  | "MESSAGE"
  | "CHANGE_NAME"
  | "PING"
  | "AUDIO_BUFFER"
  | "USER_JOIN"
  | "USER_LIST"
  | "USER_LEAVE"
  | "SOCKET_ID";

export interface SocketMessage {
  type: Events;
  content?: string;
  stat?: FFProbeResult | null;
  user?: User;
  userList?: User[];
  isBroadcast: boolean;
}

const defaultLobbies = ["test"];
const LOGIN_TRIES = 3;

export class LobbyController extends WebSocketServer {
  //sockets: Map<string, UserSocket[]> = new Map();
  lobbies: Map<string, Lobby> = new Map();
  db: Database;
  //wss: WebSocketServer;

  constructor(CONFIG: Config) {
    const app = express();
    const server = http.createServer(app);

    super(server);

    //this.wss = new WebSocketServer({ server });

    this.db = new Database(CONFIG.DATABASE_URL, CONFIG.SALT_ROUNDS);
    const _this = this;
    Lobby.controller = this;

    defaultLobbies.forEach((id) => {
      this.lobbies.set(id, new Lobby(id, defaultLobbySettings));
    });

    this.on("connection", (socket: Socket) => {
      let loggedIn = false;
      socket.on("LOGIN", async (login: string, password: string) => {
        console.log({ login, password });
        try {
          const authData = await this.db
            .collection("users")
            .authWithPassword(login, password);

          const record = authData.record as UserRecord;

          const user: User = {
            username: record.username,
            id: record.id,
            avatar: record.avatar,
            verified: record.verified,
            created: record.created,
            updated: record.updated,
          };
          loggedIn = true;

          this.handleSocket(socket, user);
        } catch (e) {
          socket.emit("MESSAGE", "You suck!");
        }
      });

      socket.on("REGISTER", async ({ login, email, password }) => {
        if (loggedIn) return;

        console.log("UserRegister", { login, email, password });

        const record = await this.db.collection("users").create({
          username: login,
          email,
          password,
          passwordConfirm: password,
        });
        if (record.id) {
          console.log(record);
          const user: User = {
            username: record.username,
            id: record.id,
            avatar: record.avatar,
            verified: record.verified,
            created: record.created,
            updated: record.updated,
          };
          loggedIn = true;

          this.handleSocket(socket, user);
        }
      });
    });

    server.listen(8080, () => {
      console.log("WebSocketServer ready!");
    });
  }

  handleSocket(socket: Socket, user: User) {
    // decide which lobby to put user in
    // currently only test lobby exists
    let lobby = this.lobbies.get("test");
    if (!lobby) {
      lobby = new Lobby("test", defaultLobbySettings);
      this.lobbies.set("test", lobby);
    }

    socket.join("test");

    const userSocket: UserSocket = {
      socket,
      user: user,
      lobby,
    };

    // Tell connecting Client user details
    socket.emit("LOGIN_SUCCESS", user);

    lobby.joinPlayer(userSocket);

    socket.on("PING", () => {
      socket.emit("PING", new Date().getTime());
    });

    socket.on("disconnect", (reason) => {
      const lobby = userSocket.lobby;
      lobby.leavePlayer(userSocket, reason);
    });
  }

  // joinLobby(socket: WebSocket) {

  // }
}

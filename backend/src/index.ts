import { LobbyController } from "./Lobby/LobbyController.js";
import { execFile } from "child_process";
import CONFIG from "../config.json" assert { "type": "json" };

// const db = execFile("../database/pocketbase", ["--serve"], (error, stdout, stderr) => {
//     if(error) {
//         throw error;
//     }
// });

const lobby = new LobbyController(CONFIG);
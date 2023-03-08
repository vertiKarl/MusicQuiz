import { Lobby } from "../Lobby.js";
import { LobbyStatus } from "../LobbyStatus.js";

export default (lobby: Lobby) => {
  lobby.isPaused = !lobby.isPaused;

  lobby.sendMsg(
    `${lobby._host?.user.username} set paused to ${lobby.isPaused}`
  );

  Lobby.controller.to(lobby.id).emit("PAUSE", lobby.isPaused);

  if (!lobby.isPaused && lobby.status !== LobbyStatus.INPROGRESS) {
    lobby.startRound();
  }
};

import { User } from "../../User/User.js";
import { Lobby } from "../Lobby.js";

export default (lobby: Lobby, user: User) => {
  const socket = lobby.players.get(user.id);
  if (socket) {
    lobby.host = socket;
  }
};

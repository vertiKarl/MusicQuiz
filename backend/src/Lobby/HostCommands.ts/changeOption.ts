import { Lobby } from "../Lobby.js";
import LobbyOptions from "../LobbyOptions.js";

export default (lobby: Lobby, option: keyof LobbyOptions, value: any) => {
  lobby.sendMsg(`${lobby._host?.user.username} set ${option} to ${value}!`);
  lobby.options[option] = value;
};

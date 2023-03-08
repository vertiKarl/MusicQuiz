import { Song } from "../Database/Song.js";

export default interface LobbyOptions {
  MAX_PLAYERS: number;
  ROUND_TIME: number;
  ALLOWED: Guessable[];
  DATE_RANGE?: DateRange;
}

type Guessable = keyof Song;

interface DateRange {
  from: Date;
  to: Date;
}

import { User } from "../User/User.js";

export default interface Answer {
  user: User;
  guesses: string[];
  points: number;
}

import { User } from "../User/User.js";

export default interface Message {
  user?: User;
  content: string[];
}

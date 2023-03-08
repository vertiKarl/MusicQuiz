import Message from "./Message";

export default interface User {
  username: string;
  id: string;
  messages?: Message[];
  score?: number;
}

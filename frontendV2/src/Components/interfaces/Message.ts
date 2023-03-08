import User from "./User";

export default interface Message {
  user?: User;
  timestamp: number;
  content: string;
  element: JSX.Element;
}

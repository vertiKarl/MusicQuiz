import { User } from "../User/User.js";

export class ChatMessage {
    constructor(
        public author: User,
        public id: string,
        public lobbyId: string,
        public content: string
    ) {}
}
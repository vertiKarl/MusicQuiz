import { ReactElement, JSXElementConstructor, ReactFragment, ReactPortal, Key } from "react";
import User from "./interfaces/User";

export function ChatMessage(props: {
    timestamp: number;
    user?: User;
    content: string;
}) {
    console.log("ChatMessage-Props", props)
    const prefix = props.user ? `${props.user.username}: ` : '';
    
    return <li className="ChatMessage">
        <div className="inline">
            <p className="hidden">{new Date(props.timestamp).toLocaleTimeString()}</p>
            <p>{prefix}{props.content}</p>
        </div>
    </li>
}
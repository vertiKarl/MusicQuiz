import { ReactElement, JSXElementConstructor, ReactFragment, ReactPortal, Key } from "react";

interface User {
    name: string,
    id: string
}

export function ChatMessage(props: {
    timestamp: number;
    user: User;
    content: string;
}) {
    
    return <li className="ChatMessage">
        <div className="inline">
            <p className="hidden">{new Date(props.timestamp).toLocaleTimeString()}</p>
            <p>{props.user.name}: {props.content}</p>
        </div>
    </li>
}
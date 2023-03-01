import React, { ChangeEvent, KeyboardEvent } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ChatMessage } from "./ChatMessage";
import { UserList } from "./UserList";

interface State {
    isCommand: boolean
    socket: WebSocket | null
    status: Status
    text: string
    messages: Message[],
    users: Map<string, User>;
}

enum Status {
    CONNECTING, CLOSED, CONNECTED
}

interface Message {
    user: User,
    timestamp: number,
    content: string,
    element: JSX.Element
}

interface User {
    name: string,
    id: string
}

export default class Chat extends React.Component {
    state: State;
    

    constructor(props: {} | Readonly<{}>) {
        super(props);
        this.state = {
            messages: [],
            isCommand: false,
            socket: null,
            status: Status.CLOSED,
            text: "",
            users: new Map()
        };

        this.handleInput = this.handleInput.bind(this);
        this.handleKeypress = this.handleKeypress.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        //this.setupSocket = this.setupSocket.bind(this);
        //this.setupSocket();
    }

    componentDidMount(): void {
        this.setupSocket();
    }

    setupSocket() {
        if(this.state.status !== Status.CLOSED) return;
        console.log("setup")
        if(!this.state.socket || this.state.socket.CLOSED) {
            this.setState({
                status: Status.CONNECTING
            })
            this.state.socket = new WebSocket(`ws://${window.location.hostname}:8080`);

            this.state.socket.onopen = (ev => {
                this.setState({
                    status: Status.CONNECTED
                })
                console.log("Connection established!")
            })

            this.state.socket.onmessage = (ev => {
                const data = JSON.parse(ev.data);
                const time = new Date().getTime()
                switch(data.type) {
                    case "MSG": {
                        this.createMessage(data.user, time, data.content);
                        break;
                    }
                    case "PING": {
                        this.createMessage(data.user, time, `Pong! (${time - data.ms}ms)`)
                        break;
                    }
                    case "CHN": {
                        console.log("CHN EVENT")
                        let users = this.state.users;
                        const user = users.get(data.user.id);
                        if(user) {
                            console.log("Renaming User("+data.user.name+"): "+data.user.name)
                            user.name = data.user.name;
                            const mg: Message[] = []
                            for(const m of this.state.messages) {
                                console.log(m.user.id, data.user.id)
                                if(m.user.id === data.user.id) {
                                    console.log("Found Message to replace:", m.content);
                                    const n = m;
                                    n.user.name = data.user.name;
                                    mg.push(n)
                                } else {
                                    mg.push(m)
                                }
                            }
                            this.setState({
                                messages: mg
                            })
                        }
                        this.createMessage(data.user, time, `Name changed to: ${data.user.name}`)
                        break;
                    }
                    case "UserJoin": {
                        const uj = this.state.users;
                        uj.set(data.user.id, data.user);

                        this.setState({
                            users: uj
                        })
                        console.log("User Joined:", data.user.name)
                        break;
                    }
                    case "UserList": {
                        console.log(data.userList)

                        this.setState({
                            users: new Map(data.userList.map((user: User) => {
                                return [user.id, user];
                            }))
                        })
                        console.log("Received Userlist from Server.")
                        break;
                    }
                    case "UserLeave": {
                        let newUsers = this.state.users;
                        const index = newUsers.get(data.user);
                        if(index) {
                            newUsers.delete(index.id)
                            console.log("User left:", data.user.name)
                            this.setState({
                                users: newUsers
                            })
                        }
                        break;
                    }
                }
            })
        }
    }

    createMessage(user: User, timestamp: number, content: string) {
        const newMessage: Message = {
            user,
            timestamp,
            content,
            element: <ChatMessage key={this.state.messages.length} timestamp={timestamp} user={user} content={content}></ChatMessage>
        } 
        this.setState({
            messages: [...this.state.messages, newMessage]
        })
    }

    handleInput(inp: ChangeEvent<HTMLInputElement>) {
        if(inp.target.value[0] === "/") {
            // command handling
            this.setState({
                isCommand: true
            })
        }

        this.setState({
            text: inp.target.value
        })
    }

    handleKeypress(event: KeyboardEvent<HTMLInputElement>) {
        if(event.key === "Enter") {
            if(this.state.isCommand) {
                this.sendCommand(this.state.text);
            } else {
                this.sendMessage(this.state.text);
            }
            this.setState({
                text: "",
                isCommand: false
            })
        }
    }

    sendCommand(content: string) {
        if(!this.state.socket) return;
        content = content.replace("/", "");

        const cmd = content.split(" ")[0].toUpperCase();
        const args = content.substring(cmd.length).trim().split(" ");

        console.log({cmd, args})

        const data = JSON.stringify(
            {
                type: cmd,
                content: args
            }
        )

        console.log(data)

        this.state.socket.send(data);
    }

    sendMessage(content: string) {
        if(!this.state.socket) return;

        const data = JSON.stringify(
            {
                type: "MSG",
                content: content
            }
        )
        //this.createMessage("", new Date().getTime(), content);

        this.state.socket.send(data)

    }

    render() {
        const msgElements = [];
        for(const m of this.state.messages) {
            msgElements.push(m.element);
        }

        const users = Array.from(this.state.users.values())

        return (
            <div className="Container">
                <div className="Chat">
                    <input value={this.state.text} type="text" className="ChatInput" onChange={this.handleInput} onKeyDown={this.handleKeypress}></input>
                    <ul className="ChatLog">{msgElements}</ul>
                </div>
                <UserList users={users}></UserList>
            </div>
        )
    }
}
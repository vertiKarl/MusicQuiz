import React, { ChangeEvent, KeyboardEvent } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

interface State {
    socket: WebSocket | null
    status: Status
    text: string
}

enum Status {
    CONNECTING, CLOSED, CONNECTED
}

export default class Chat extends React.Component {
    state: State;

    constructor(props: {} | Readonly<{}>) {
        super(props);
        this.state = {socket: null, status: Status.CLOSED, text: ""};

        this.handleInput = this.handleInput.bind(this);
        this.handleKeypress = this.handleKeypress.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        //this.setupSocket = this.setupSocket.bind(this);
        this.setupSocket();
    }

    setupSocket() {
        if(this.state.status !== Status.CLOSED) return;
        console.log("setup")
        if(!this.state.socket || this.state.socket.CLOSED) {
            this.setState({
                status: Status.CONNECTING
            })
            this.state.socket = new WebSocket("ws://127.0.0.1:8080");

            this.state.socket.onopen = (ev => {
                this.setState({
                    status: Status.CONNECTED
                })
                console.log("Connection established!")
            })
        }
    }

    handleInput(inp: ChangeEvent<HTMLInputElement>) {
        if(inp.target.value[0] === "/") {
            // command handling
        } else {
            this.setState({
                text: inp.target.value
            })
        }
    }

    handleKeypress(event: KeyboardEvent<HTMLInputElement>) {
        if(event.key === "Enter") {
            this.sendMessage(this.state.text);
            this.setState({
                text: ""
            })
        }
    }

    sendMessage(content: string) {
        if(!this.state.socket) return;

        const data = JSON.stringify(
            {
                type: "MSG",
                content: content
            }
        )
        this.state.socket.send(data)

    }

    render() {
        return <div className="Chat">
            <input value={this.state.text} type="text" className="ChatInput" onChange={this.handleInput} onKeyDown={this.handleKeypress}></input>
        </div>
    }
}
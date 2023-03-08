import React, { ChangeEvent, KeyboardEvent } from "react";
import { ChatMessage } from "./ChatMessage";
import { UserList } from "./UserList";
import { io, Socket } from "socket.io-client";
import { Login } from "./login";
import Connecting from "./Connecting";
import User from "./interfaces/User";
import Message from "./interfaces/Message";
import { Song } from "./interfaces/Song";
import MediaPlayer from "./MediaPlayer";
import EventEmitter from "events";

interface State {
    //audioContext: AudioContext | null
    connected: boolean
    mpEvents: EventEmitter
    roundActive: boolean
    //gain: GainNode | null
    guessedRight: boolean
    loggedIn: boolean
    lastSong: Song | null
    isCommand: boolean
    isHost: boolean
    isPaused: boolean
    lobbyStatus: 'Guess Time' | 'Chill Time'
    socket: Socket | null
    status: Status
    text: string
    messages: Message[]
    users: User[]
    user: User
    volume: number
}

enum Status {
    CONNECTING, CLOSED, CONNECTED
}

interface Cookie {
    login?: { login: string; password: string; };
    user: User
}

export default class Chat extends React.Component {
    state: State;
    audio: AudioContext | null = null;
    

    constructor(props: {} | Readonly<{}>) {
        super(props);

        this.state = {
            connected: false,
            loggedIn: false,
            roundActive: false,
            guessedRight: true,
            //gain: null,
            lastSong: null,
            lobbyStatus: 'Chill Time',
            mpEvents: new EventEmitter(),
            user: {
                username: "",
                id: "",
                messages: []
            },
            messages: [],
            isCommand: false,
            isHost: false,
            isPaused: false,
            socket: null,
            status: Status.CLOSED,
            text: "",
            users: [],
            volume: 50,
            //audioContext: null
        };

        this.handleInput = this.handleInput.bind(this);
        this.handleKeypress = this.handleKeypress.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.createAudioContext = this.createAudioContext.bind(this);
        this.handleVolume = this.handleVolume.bind(this);
        //this.setupSocket = this.setupSocket.bind(this);
        //this.setupSocket();
    }

    componentDidMount(): void {
        this.loadCookie();
        if(!this.state.socket) this.setupSocket();
    }

    loadCookie(): void {
        const c = this.getCookie();


        if(c.user) {
            this.setState({user: c.user})
        } else {
            this.setState({
                user: {
                    name: '',
                    id: '',
                    messages: []
                }
            })
        }
    }

    getCookie(): Cookie {
        let c = document.cookie;
        if(!c) return {
                user: {
                    username: '',
                    id: ''
                }
            };

        c = c.replaceAll(";SameSite=None", "");


        return JSON.parse(c);
    }

    setCookie(c: Cookie): void {
        c.user.messages = [];
        document.cookie = JSON.stringify(c) + ";SameSite=None"
    }

    setupSocket(): void {
        if(this.state.socket && this.state.socket.connected) return;

        const socket = io(':8080');
        
        this.setState({
            socket
        })
        
        socket.on('connect', () => {

            this.setState({
                connected: true
            })

            const c = this.getCookie();


            if(!this.state.loggedIn && c.login?.login) {
                this.login(c.login.login, c.login.password, false);
            }
        })

        socket.on("LOGIN_SUCCESS", (user: User) => {
            this.setState({
                loggedIn: true,
                user
            })

            this.setupSocketEvents(socket);
        })

        socket.on("disconnect", () => {
            this.setState({
                loggedIn: false,
                connected: false
            })
        })

        
    }
    
    setupSocketEvents(socket: Socket): void {
        socket.on("USER", (user: User) => {
            const c = this.getCookie();

            if(c.user.username && c.user.username !== user.username) {
                user.username = c.user.username[0]
            }

            this.setState({
                user: user
            }, () => {
                const users = this.state.users;
                for(let i = 0; i < users.length; i++) {
                    if(users[i].id === this.state.user.id) {
                        users[i] = this.state.user;
                    }
                }
            })
        })

        socket.on('CHANGE_NAME', (user: User) => {
            if(user.id === this.state.user?.id) {
                const c = this.getCookie();
                c.user.username = user.username;
                this.setCookie(c);

                this.setState({
                    user
                })

                this.createMessage(`Successfully changed name to ${user.username}!`);
            } else {
                const users = this.state.users;
                for(const u of users) {
                    if(u.id === user.id) {
                        this.createMessage(`${u.username} changed their name to ${user.username}!`)
                        u.username = user.username;
                        this.setState({
                            users: users
                        })
                    }
                }

            }
        })

        socket.on('MESSAGE', (message: Message) => {
            this.createMessage(message.content, message.user);
        })

        // let audio_src = this.state.audioContext?.createBufferSource();
        // let _offset = 0;

        socket.on("AUDIO_FILE", (data) => {
            // const ctx = this.state.audioContext;
            // const gain = this.state.gain;
            
            // if(!ctx || !gain) return;

            // const analyzer = ctx.createAnalyser();
            
            // audio_src = ctx.createBufferSource();
            // ctx.decodeAudioData(data, (buffer) => {
            //     if(buffer.length > 0) {
            //         audio_src!.buffer = buffer;
            //         audio_src!.connect(gain);

            //         analyzer.connect(gain);

            //         audio_src!.start(0, _offset);
            //     }
            // })

            this.state.mpEvents.emit("DATA", data);
            //this.state.mediaPlayer.drawVisualizer();
        })

        socket.on("USER_LIST", (users: User[]) => {
            if(this.state.user) {
                for(const i in users) {
                    if(users[i].id === this.state.user.id) {
                        users[i] = this.state.user;
                    }
                }
            }

            this.setState({
                users
            })
        })

        socket.on("USER_JOIN", (user: User) => {
            this.setState({
                users: [...this.state.users, user]
            })
        })

        socket.on("USER_LEAVE", (user: User) => {
            const users = this.state.users;
            for(let i = 0; i < users.length; i++) {
                if(users[i].id === user.id) {
                    users.splice(i, 1);
                }
            }

            this.setState({
                users: users
            })
        })

        socket.on("PING", (time: number) => {
            this.createMessage(`Pong! (${new Date().getTime() - time}ms)`)
        })

        socket.on("ROUND_START", (offset: number) => {
            this.state.mpEvents.emit("PLAY", offset);
            //_offset = offset;

            this.setState({
                lobbyStatus: 'Guess Time',
                roundActive: true
            })
        })

        socket.on("ROUND_END", (score: {}, song: Song) => {
            // try {
            //     audio_src?.stop(5);
            // } catch {}
            this.state.mpEvents.emit("STOP");
            const users = this.state.users

            for(const [id, points] of Object.entries(score)) {
                for(const u of users) {
                    if(u.id === id) {
                        u.score = points as number;
                    }
                }
            }

            const isAnime = song.anime;
            const isGame = song.game;

            let suffix = ' '

            if(isAnime && !isGame) {
                suffix += `from the anime ${song.anime}`
            } else if(!isAnime && isGame) {
                suffix += `from the game ${song.game}`
            } else if(isAnime && isGame) {
                suffix += `from the anime/game ${song.anime}/${song.game}`
            }

            this.createMessage(`The song was: ${song.artist} - ${song.title}${suffix}`)

            this.setState({
                lastSong: song,
                lobbyStatus: 'Chill Time',
                roundActive: false,
                users
            })
        })

        socket.on("ANSWER_RIGHT", ({
            type,
            points,
            max_points,
        }) => {
            this.createMessage(`You guessed the ${type}! (${points}/${max_points})`)

            this.setState({
                guessedRight: true
            })

            setInterval(() => {this.setState({
                guessedRight: false
            })})
        })

        socket.on("PAUSE", (isPaused: boolean) => {
            if(isPaused) {
                this.createMessage("Host set the game to pause after this round!");
            } else {
                this.createMessage("Host unpaused the game!");
            }
            
            this.setState({
                isPaused: isPaused
            });
        })

        socket.on("HOST_TRANSFER", (id: string) => {
            if(this.state.user.id === id) {
                this.setState({
                    isHost: true
                })
                this.createMessage("You are now the host of this lobby!");
            } else {
                let u = ''
                for(const user of this.state.users) {
                    if(user.id === id) {
                        u = user.username;
                    }
                }
                this.setState({
                    isHost: false
                })
                this.createMessage(`${u} is now the host of this lobby!`);
            }
        })

    }

    createAudioContext() {
        const ctx = new AudioContext();
        const gain = ctx.createGain();

        gain.connect(ctx.destination);

        this.setState({
            audioContext: ctx,
            gain
        });
    }

    handleVolume(ev: ChangeEvent<HTMLInputElement>) {
        const volume = ev.target.valueAsNumber / 100;
        this.state.mpEvents.emit("VOLUME", volume);

        // if(!this.state.gain) return;


        // const node = this.state.gain;
        // node.gain.value = volume;

        // this.setState({
        //     gain: node,
        //     volume
        // })
    }

    login(login: string, password: string, rememberMe: boolean) {
        this.state.socket?.emit("LOGIN", login, password);

        if(rememberMe) {
            let c = this.getCookie();
            c.login = {
                login,
                password
            }

            this.setCookie(c);
        }
    }

    register(login: string, email: string, password: string): boolean {
        // Test email against regex
        if(!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
            console.log("Invalid Email-address!")
            return false;
        }
        if(login.length > 32) {
            console.log("Username to long")
            return false;
        }
        if(password.length < 8) {
            console.log("Password must contain 8 characters or more")
            return false;
        }

        this.state.socket?.emit("REGISTER", {login, email, password});
        return true;
    }

    createMessage(content: string, user?: User) {
        const timestamp = new Date().getTime();
        const newMessage: Message = {
            user,
            timestamp,
            content,
            element: <ChatMessage key={timestamp} timestamp={timestamp} user={user} content={content}></ChatMessage>
        } 
        this.setState({
            messages: [...this.state.messages, newMessage]
        })

        setTimeout(() => {
            const messages = this.state.messages
            const newMessages = []
            for(let i = 0; i < messages.length; i++) {
                if(messages[i].timestamp !== newMessage.timestamp) {
                    newMessages.push(messages[i]);
                }
            }
            this.setState({
                messages: newMessages
            })
        }, 30 * 1000)
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
        if(event.key === "Enter" && this.state.text !== '') {
            if(this.state.isCommand) {
                if(this.state.text.toLowerCase() === "/logout") {
                    const c = this.getCookie();
                    if(c.login) {
                        delete c.login
                    }
                    this.setCookie(c);

                    this.setState({
                        user: {},
                        loggedIn: false
                    })

                    window.location.reload();


                } else this.sendCommand(this.state.text);
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

        this.state.socket.emit(cmd, args);
    }

    sendMessage(content: string) {
        if(!this.state.socket || !this.state.socket.connected) return;

        if(!this.state.user) throw new Error("Userstate is null :(");


        if(this.state.roundActive) {

            this.state.socket.emit("ANSWER", this.state.user, content.trim());

        } else {
            const message = {
                user: this.state.user,
                timestamp: new Date().getTime(),
                content: content
            }
            this.createMessage(content, this.state.user);
    
            this.state.socket.emit("MESSAGE", message)
        }
        


    }

    render() {
        if(!this.state.connected) {
            return (
                <Connecting></Connecting>
            )
        }
        if(this.state.loggedIn) {
            const msgElements = [];
            for(const m of this.state.messages) {
                msgElements.push(m.element);
            }
    
            const users = Array.from(this.state.users.values())

            let statusClasses = "lobbyStatusWrapper"

            if(this.state.lobbyStatus === 'Chill Time') {
                if(this.state.isPaused) {
                    statusClasses += " pauseTime"
                } else {
                    statusClasses += " chillTime"
                }
            } else if(this.state.lobbyStatus === 'Guess Time') {
                statusClasses += " guessTime"
            }

            let chatClasses = "ChatInput"
            if(this.state.guessedRight) chatClasses += " correct";
    
            return (
                <>
                    <div className={statusClasses}>
                        <p>{this.state.lobbyStatus}</p>
                    </div>
                    <div className="Container">
                        <div className="Chat component">
                            <input name="volume" type="range" min="0" max="100" step="1" onChange={this.handleVolume}></input>
                            <input value={this.state.text} type="text" placeholder="type to message" className="ChatInput" onChange={this.handleInput} onKeyDown={this.handleKeypress}></input>
                            <ul className="ChatLog">{msgElements}</ul>
                            {/* {
                                !this.state.audioContext && (
                                    <>
                                        <button onClick={this.createAudioContext}>Click for audio!</button>
                                    </>
                                )
                            } */}
                            
                        </div>
                        <UserList users={users}></UserList>
                        <MediaPlayer animating={false} isHost={this.state.isHost} events={this.state.mpEvents}></MediaPlayer>
                    </div>
                </>
            )
        } else {
            return <Login chat={this} loggedIn={this.state.loggedIn}></Login>;
        }
    }
}
import React, { ChangeEvent, FormEvent } from "react";
import Chat from "./chat";

interface LoginProps {
    chat: Chat,
    loggedIn: boolean
}

interface LoginState {
    rememberMe: boolean
    isRegister: boolean
    loggedIn: boolean
    login: string
    email: string
    password: string
    chat: Chat
}

export class Login extends React.Component<{chat: Chat, loggedIn: boolean}> {
    state: LoginState

    constructor(props: LoginProps) {
        super(props);
        this.state = {
            email: '',
            rememberMe: false,
            isRegister: false,
            loggedIn: props.loggedIn,
            login: '',
            password: '',
            chat: props.chat
        }

        this.handleLoginString = this.handleLoginString.bind(this);
        this.handlePassword = this.handlePassword.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleSubmitRegister = this.handleSubmitRegister.bind(this);
    }

    handleLoginString(inp: ChangeEvent<HTMLInputElement>) {
        this.setState({
            login: inp.target.value
        })
    }

    handlePassword(inp: ChangeEvent<HTMLInputElement>) {
        this.setState({
            password: inp.target.value
        })
    }

    handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        console.debug(this.state);

        this.state.chat.login(this.state.login, this.state.password, this.state.rememberMe);
    }

    handleSubmitRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        console.debug(this.state);

        const success = this.state.chat.register(this.state.login, this.state.email, this.state.password);
        console.debug("Send register?",success)
    }

    render() {
        if(this.state.isRegister) {
            return (
                <form className="loginForm" onSubmit={this.handleSubmitRegister}>
                    <input name="username" placeholder="Username" value={this.state.login} onChange={this.handleLoginString}></input>
                    <input name="email" placeholder="EMail" value={this.state.email} onChange={(ev) => {this.setState({email: ev.target.value})}}></input>
                    <input name="password" type="password" placeholder="Password" value={this.state.password} onChange={this.handlePassword}></input>
                    <input type="submit" value="Submit"></input>
                    <button onClick={() => this.setState({isRegister: false})}>Already have an account?</button>
                </form>  
            )
        } else {
            return (
                <form className="loginForm" onSubmit={this.handleSubmit}>
                    <h1 className="loginTitle">Login:</h1>
                    <input name="login" placeholder="Name/Email" value={this.state.login} onChange={this.handleLoginString}></input>
                    <input name="password" type="password" placeholder="password" value={this.state.password} onChange={this.handlePassword}></input>
                    <label>
                        Remember me?
                        <input name="rememberMe" type="checkbox" onChange={() => this.setState({rememberMe: !this.state.rememberMe})}></input>
                    </label>
                    <input type="submit" value="Submit"></input>
                    <button onClick={() => this.setState({isRegister: true})}>Register</button>
                </form>
            )
        }
    }
}
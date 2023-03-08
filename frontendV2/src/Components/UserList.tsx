import React from "react";
import User from "./interfaces/User";

export class UserList extends React.Component<{users: User[]}> {
    state: { users: User[] };

    constructor(props: {
        users: User[];
    }) {
        super(props);
        this.state = { users: props.users };
    }

    componentWillReceiveProps(nextProps: { users: User[]; }) {
        // You don't have to do this check first, but it can help prevent an unneeded render
        if (nextProps.users !== this.state.users) {
            this.setState({ users: nextProps.users });
        }
    }

    render() {
        const users = []

        for(const i in this.state.users) {
            const u = this.state.users[i]
            //console.log("USER: ",this.state.users[i]);
            users.push(<p key={i}>{u.username}{u.score ? `: ${u.score}` : ''}</p>)
        }

        return (
            <div className="UserList component">
                Users ({users.length}):
                {users}
            </div>
        )
    }
}
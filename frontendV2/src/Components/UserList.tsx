import React from "react";

interface User {
    name: string,
    id: string
}

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
        console.log("UPDATING USERLIST")
        const users = []

        for(const i in this.state.users) {
            //console.log("USER: ",this.state.users[i]);
            users.push(<p key={i}>{this.state.users[i].name}</p>)
        }

        return (
            <div className="UserList">
                {users}
            </div>
        )
    }
}
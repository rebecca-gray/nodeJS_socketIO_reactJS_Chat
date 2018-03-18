import React from "react";
import io from "socket.io-client";

class Chat extends React.Component{
    constructor(props){
        super(props);

        this.state = {
            username: '',
            message: '',
            messages: [],
            room: ''
        };

        this.initialize = ev => {
            ev.preventDefault();
            this.socket = io('localhost:8000');

        	this.socket.on('connect', () => {
                console.log('connect');
                this.socket.emit('SET_NICKNAME', {
                   socket: this.socket.id,
                   nickname: this.state.username,
               });
            });

            this.socket.on('RECEIVE_MESSAGE', (data) => {
                console.log('RECEIVE_MESSAGE');
                if (data.message.split('.')[0] === 'Chat ended') {
                    this.state.messages = [];
                    this.state.username = [];
                    this.room = '';
                }
                addMessage(data);
            });


            this.socket.on('INITIALIZE_CLIENT', (data) => {
                console.log('INITIALIZE_CLIENT');
                console.log(data.room);
                this.state.room = data.room;
                addMessage(data);
            });

            this.socket.on('WAITING', (data) => {
                console.log('WAITING');
                addMessage(data);
            })
        }


        const addMessage = (data) => {
            console.log("addMessage", data);
            let message = data.message;
            if (data.author) {
                message = `${data.author}: ${data.message}`;
            }
            this.setState({messages: [...this.state.messages, message]});
            console.log(this.state.messages);
        };

        this.sendMessage = ev => {
            ev.preventDefault();
            this.socket.emit('SEND_MESSAGE', {
                author: this.state.username,
                message: this.state.message,
                room: this.state.room,
            })
            this.setState({message: ''});

        }
    }
    render(){
        return (
            <div className="container">
                <div className="row">
                    <div className="col-4">
                        <div className="card">
                            <div className="card-body">
                                <div className="card-title">Chat Random</div>
                                <hr/>
                                <div className="messages">
                                    {this.state.messages.map((message, index) => {
                                        return (
                                            <div key={index}>{message}</div>
                                        )
                                    })}
                                </div>

                            </div>
                            <div className="card-footer">
                                <input type="text" placeholder="Username" value={this.state.username} onChange={ev => this.setState({username: ev.target.value})} className="form-control"/>
                                <br/>
                                <input type="text" placeholder="Message" className="form-control" value={this.state.message} onChange={ev => this.setState({message: ev.target.value})}/>
                                <br/>
                                <button onClick={this.sendMessage} className="btn btn-primary form-control">Send Message</button>
                                <button onClick={this.initialize} className="btn btn-primary form-control">Join Chat</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Chat;

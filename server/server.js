'use strict';
const PORT = process.env.PORT || 8000;
const server = require('http').Server()
server.listen(PORT, () => console.log(`Listening on ${ PORT }`));
const _ = require('underscore');

const io = require('socket.io')(server);
const users = {}; // socket.id: {socket, nickname},
const waiting = []; // socket,

/*
* create a new room
*/
const getRoom = (socket, partner) =>
    `${socket.id}|partition|${partner.id}`;

/*
* add clients to the room
*/
const joinRoom = (socket, partner, room) => {
    const clients = [socket, partner];
    _.each(clients, (client) => {
        client.join(room);
    });
}

/*
* send message initializing room on client
*/
const initRoom = (room) => {
    io.to(room).emit('INITIALIZE_CLIENT', {
        room,
        author: '',
        message: 'Connection Made!'
    });
}

/*
*  When a pairing is made
*  two users are paired in a new room
*  the users join the room and and informed.
*/
const userWaitingResolved = (socket) => {
    const partner = waiting.shift();
    const room = getRoom(socket, partner);
    users[socket.id] = {
        socket,
        nickname: '',
    };
    console.log(`Client room ${room}`);
    joinRoom(socket, partner, room);
    initRoom(room);
}

/*
*  adds the users socket to a list of waiting users
*  informs the user that they are in the que.
*/
const userWaiting = (socket) => {
    waiting.push(socket);
    io.to(socket.id).emit('WAITING', {
        message: 'We are looking for a partner...'
    });
}


/*
*  adds a nickname to the user's profile
*/
const setNickname = (data) => {
    if (users[data.socket]) {
        users[data.socket].nickname = data.nickname;
    }
}

/*
*  handles a message of IRC delay
*  sends the message in data, after the delay specified.
*/
const sendMessageIRCDelay = (data, irc) => {
    console.log(irc);
    const message = irc[2];
    const delay = irc[1];
    setTimeout(() => {
        sendMessage({
            message,
            author: data.author,
            room: data.room,
        });
    }, delay);
}

/*
*  handles a message of IRC hop
*  closes the chat room & informs the clients in that room.
*/
const sendMessageIRCHop = (data) => {
    sendMessage({
        message: 'Chat ended. Please reconnect to join another chat.',
        room: data.room,
    });
    const clients = data.room.split('|partition|');
    _.each(clients, (client) => {
        if (users[client]) {
            users[client].socket.leave(data.room);
        }
    });
}

/*
*  handles a message of IRC format
*  currently supports /delay and /hop
*  other IRC prefixes will be sent as regular messages
*/
const sendMessageIRC = (data) => {
    // irc formated message
    const irc = data.message.split(' ');
    const prefix = irc[0];
    switch (prefix) {
        case '/delay':
            console.log('delay');
            sendMessageIRCDelay(data, irc);
            break;
        case '/hop':
            console.log('hop');
            sendMessageIRCHop(data);
            break;
        default:
            console.log('unsupported irc prefix');
            sendMessage(data);
    }
}

/*
*  sends message to a room provided as data.room
*
*/
const sendMessage = (data) => {
    console.log(`sendMessage`);
    io.to(data.room).emit('RECEIVE_MESSAGE', data);
}



/*
*   Define connection events for sockets
*
*/

io.on('connection', (socket) => {
    console.log(`Client connected ${socket.id}`);

    if (waiting.length) {
        console.log(`Client connecting ${socket.id}`);
        userWaitingResolved(socket);
    } else {
        console.log(`Client waiting ${socket.id}`);
        userWaiting(socket);
    }

    socket.on('SET_NICKNAME', (data) => {
        console.log(`nickname ${data.nickname}`);
        setNickname(data);
    });

    socket.on('SEND_MESSAGE', (data) => {
        console.log(data);
        if (!data.room) {
            console.log("error: No room provided");
            return;
        }
        if (data.message.split(' ')[0].indexOf('/') !== -1) {
            console.log('irc');
            sendMessageIRC(data);
        } else {
            sendMessage(data);
        }
    });

    socket.on('error', (err) => {
        console.log("Error", err);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

});

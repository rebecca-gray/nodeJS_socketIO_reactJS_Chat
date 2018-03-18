'use strict';
const PORT = process.env.PORT || 8000;
const server = require('http').Server()
server.listen(PORT, () => console.log(`Listening on ${ PORT }`));
const _ = require('underscore');

const io = require('socket.io')(server);
const users = {}; // socket.id: {socket, nickname},
const waiting = []; // socket,

io.on('connection', (socket) => {
    console.log(`Client connected ${socket.id}`);

    if (waiting.length) {
        console.log(`Client connecting ${socket.id}`);
        const partner = waiting.shift();
        const room = `${socket.id}|partition|${partner.id}`;
        users[socket.id] = {
            socket,
            nickname: '',
        };
        console.log(`Client room ${room}`);
        const clients = [socket, partner];
        _.each(clients, (client) => {
            client.join(room);
        });
        io.to(room).emit('INITIALIZE_CLIENT', {
            room,
            author: '',
            message: 'Connection Made!'
        });

    } else {
        waiting.push(socket);
        console.log(`Client waiting ${socket.id}`);
        io.to(socket.id).emit('WAITING', {
            message: 'We are looking for a partner...'
        });
    }

    socket.on('SET_NICKNAME', (data) => {
        console.log(`nickname ${data.nickname}`);
        if (users[data.socket]) {
            users[data.socket].nickname = data.nickname;
        }
    });

    socket.on('SEND_MESSAGE', (data) => {
        console.log(data);
        if (!data.room) {
            console.log("error: No room provided");
            return;
        }
        if (data.message.split(' ')[0].indexOf('/') !== -1) {
            console.log('irc');
            // irc formated message
            const irc = data.message.split(' ');
            const prefix = irc[0];
            switch (prefix) {
                case '/delay':
                    console.log('delay');
                    const message = irc[2];
                    const delay = irc[1];
                    _.delay(() => {
                        io.to(data.room).emit('RECEIVE_MESSAGE', {
                            message,
                            author: data.author,
                        });
                    }, delay);
                    break;
                case '/hop':
                    console.log('hop');
                    io.to(data.room).emit('RECEIVE_MESSAGE', {
                        message: 'Chat ended. Please reconnect to join another chat.',
                        author: data.author,
                    });
                    const clients = data.room.split('|partition|');
                    _.each(clients, (client) => {
                        if (users[client]) {
                            users[client].socket.leave(data.room);
                        }
                    });
                    break;
                default:
                    console.log('unsupported irc prefix');
                    io.to(data.room).emit('RECEIVE_MESSAGE', data);
            }

        } else {
            io.to(data.room).emit('RECEIVE_MESSAGE', data);
        }
    });

    socket.on('error', (err) => {
        console.log("Error", err);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected')
    });

});

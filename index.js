const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const gameRooms = [];
let players = []
let messages = [];
let messageId = 0;
let playerOrder = 1;

/**
 * ADD TO SERVER SIDE MESSAGES ARRAY TO KEEP CHAT LOG, NUMBER EACH ONE, 
 * ADD MESSAGE AND SENDER IN OBJ, THEN WHEN NEW PLAYER JOINS REBUILD LOG FOR THEM
 */

/**
 * original app.use, pre react integration
 */
    app.use(express.static('.'));

//app.use(express.static(path.join(__dirname, 'client/build')));

/**
 * Routes
 */
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/tic', (req, res) => {
        res.sendFile(path.join(__dirname, 'tictactoe.html'));
    });

    app.get('/crazy', (req, res) => {
        res.sendFile(path.join(__dirname, 'crazyIndex.html'));
    });

/**
 * /crazy NAMESPACE
 */
    io.of("/crazy").on('connection', (socket) => {
        //console.log('New connection: ' + socket.id)
        /**
         * On createRoom evt, join created room,
         * add to player array on server,
         * emit newRoom event, pass roomName, username, and server side player array
         * 
         */
            socket.on('createRoom', (data) => {
                socket.join(`${data.roomName}`);
                data.player.socketId = socket.id;
                players.push(data.player);
                gameRooms.push({room: data.roomName, owner: data.username});
                console.log(players);
                socket.emit('newRoom', 
                    { 
                        roomName: data.roomName,
                        username: data.username,
                        players: players,
                        owner: data.username
                    });
            });

        /**
         * On joinRoom evt, takes data arg with joining players username and requested room name,
         * Check if room exists, can check room.length for players in room, can set room limit here,
         * If room exists, join, push obj to server side player arr,
         * Broadcast updateOtherRoomsAfterJoin evt to room, pass in player Arr,
         * Emit newPlayerJoins evt, pass in username, roomName, and player Arr
         * Else room doesn't exist, or is full, throws error that room doesn't exist, or is full
         */
            socket.on('joinRoom', (data) => {
                const { username, roomName, player } = data;
                const room = io.nsps['/crazy'].adapter.rooms[roomName];
                if(room){
                    socket.join(roomName);
                    player.order = playerOrder++;
                    player.socketId = socket.id;
                    players.push(player)
                    socket.emit('newPlayerJoins', 
                        {
                            username,
                            roomName,
                            players,
                            owner: gameRooms[0].owner,
                            order: player.order,
                            socketId: socket.id
                        })
                    socket.broadcast.to(roomName).emit('updateOtherPlayersAfterJoin', { players });
                    console.log(players)
                }
                else{
                    socket.emit('err', { type:'roomNotFound', message: 'Sorry, room doesn\'t exist'});
                }
            });

        /**
         * On player disconnection, or leaveRoom button clicked, emit disconnect
         * emit updateOtherRoomsAfterJoin, pass in players Arr
         */
            socket.on('leave', (data) => {
                let index;
                for(let i = 0; i < players.length; i++){
                    if(players[i].username === data.name){
                        index = i;
                    }
                }
                players.splice(index, 1);
                socket.broadcast.to(data.room).emit('updatePlayersAfterLeave', { players });
            })


        /**
         * emit playerReady from client
         */
            socket.on('playerReady', (data) => {
                const { username, order, socketId, room, buttonId } = data; 
                if(order === buttonId){
                    const findObj = players.find(item => item.username === username);
                    players[order].ready = true;
                    socket.emit('playerReadyUp', { players });
                    socket.broadcast.to(room).emit('updatePlayersAfterReady', { players });
                }
                else{
                    socket.emit('err', { type: 'permissionDenied', message: 'You can\'t ready up for another player'});
                }  
            });










        /**
         * A player changes their ready status to unready
         */
            socket.on('playerUnready', (data) => {
                const { name, room, status } = data;
                
                socket.emit('playerUnreadyUp', {name, room, status: false});
                socket.broadcast.to(room).emit('playerUnreadyUp', {name, room, status: false});
            })

        /**
         * On message emit
         */
            socket.on('message', (data) => {
                const message = data.message;
                const from = data.from;
                const room = data.room;
                socket.emit('message', { message, from });
                socket.broadcast.to(room).emit('message', { message, from })

                messages.push({
                    id: messageId++,
                    from: from,
                    to: room,
                    text: message
                });
            });

            search = (key, arr) => {
                for(let i = 0; i < arr.length; i++){
                    if(arr[i].username == key){
                        return arr[i]
                    }
                }
            }
        /**
         * On isTyping
         */
            socket.on('isTyping', (data) => {
                const name = data.name;
                const room = data.room;
                socket.emit('isTyping', { name });
                socket.broadcast.to(room).emit('isTyping', { name })
            });
        /**
         * disconnection event
         */
    })

/**
 * Socket connections
 */
io.of('/tic').on('connection', (socket) => {
    // Create a new game room and notify the creator of game.
    socket.on('createGame', (data) => {
        socket.join(`room-${++rooms}`);
        socket.emit('newGame', { name: data.name, room: `room-${rooms}` });
    });

    // Connect the Player 2 to the room he requested. Show error if room full.
    socket.on('joinGame', function (data) {
        var room = io.nsps['/tic'].adapter.rooms[data.room];
        if (room && room.length === 1) {
            socket.join(data.room);
            socket.broadcast.to(data.room).emit('player1', {});
            socket.emit('player2', { name: data.name, room: data.room })
        } else {
            socket.emit('err', { message: 'Sorry, The room is full!' });
        }
    });

    /**
       * Handle the turn played by either player and notify the other.
       */
    socket.on('playTurn', (data) => {
        socket.broadcast.to(data.room).emit('turnPlayed', {
            tile: data.tile,
            room: data.room
        });
    });

    /**
       * Notify the players about the victor.
       */
    socket.on('gameEnded', (data) => {
        socket.broadcast.to(data.room).emit('gameEnd', data);
    });
});

server.listen(process.env.PORT || 5000);
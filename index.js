const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
let rooms = 0;
let players = []
let messages = [];
let messageId = 0;


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
 * Socket connections
 */
io.on('connection', (socket) => {

    /**
     * On createRoom evt, join created room,
     * add to player array on server,
     * emit newRoom event, pass roomName, username, and server side player array
     * 
     */
    socket.on('createRoom', (data) => {
        socket.join(`${data.roomName}`);
        players.push({
            username: data.username,
            inGame: false,
            ready: false,
            roomOwner: true
        })
        socket.emit('newRoom', { roomName: data.roomName, username: data.username, players: players })
    });

    /**
     * On joinRoom evt, takes data arg with joining players username and requested room name,
     * Check if room exists, can check room.length for players in room, can set room limit here,
     * If room exists, join, push obj to server side player arr,
     * Broadcast updateOtherRoomsAfterJoin evt to room, pass in player Arr,
     * Emit newPlayerJoins evt, pass in username, roomName, and player Arr
     * Else room doesnt exist, or is full, throws error that room doesnt exist, or is full
     */
    socket.on('joinRoom', (data) => {
        const { username, roomName } = data;
        const room = io.nsps['/'].adapter.rooms[data.roomName];
        if(room){
            socket.join(data.roomName);
            players.push({
                username: data.username,
                inGame: false,
                ready: false,
                roomOwner: false
            })
            socket.broadcast.to(data.roomName).emit('updateOtherRoomsAfterJoin', { players })
            socket.emit('newPlayerJoins', { username, roomName, players })
        }
        else{
            socket.emit('err', { type:'roomNotFound', message: 'Sorry, room doesnt exist'});
        }
    });
    
    /**
     * On player disconnection, or leaveRoom button clicked, emit disconnect
     * emit updateOtherRoomsAfterJoin, pass in players Arr
     */
    socket.on('disconnect', () => {
        let i = players.indexOf(socket);
        players.splice(i, 1);
        socket.broadcast.emit('updateOtherRoomsAfterJoin', { players })
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

    /**
     * On isTyping
     */
    socket.on('isTyping', (data) => {
        const name = data.name;
        const room = data.room;
        socket.emit('isTyping', { name });
        socket.broadcast.to(room).emit('isTyping', { name })
    })




    // Create a new game room and notify the creator of game.
    socket.on('createGame', (data) => {
        socket.join(`room-${++rooms}`);
        socket.emit('newGame', { name: data.name, room: `room-${rooms}` });
    });

    // Connect the Player 2 to the room he requested. Show error if room full.
    socket.on('joinGame', function (data) {
        var room = io.nsps['/'].adapter.rooms[data.room];
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
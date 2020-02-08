const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
let rooms = 0;
let players = []

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

app.get('/crazy/:roomId', (req, res) => {
    //res.sendFile(path.join(__dirname, "crazy-rooms.html"));
    //res.send(path.join(__dirname, "crazy-rooms.html"), {roomId: req.params.roomId})
})


/**
 * Socket connections
 */
io.on('connection', (socket) => {

    //create room
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

    //join a room
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
            socket.emit('err', { message: 'Sorry, room doesnt exist'});
        }
    });

    socket.on('disconnect', () => {
        let i = players.indexOf(socket);
        players.splice(i, 1);
        socket.broadcast.emit('updateOtherRoomsAfterJoin', { players })
    })

    socket.on('message', (data) => {
        const message = data.message;
        socket.emit('message', { message })
    })
//maybe need to have the message send a broadcast too based on the id or some shit idk




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
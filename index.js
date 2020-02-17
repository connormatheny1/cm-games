require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bcrypt = require('bcrypt');
//const db = require('./db');
const gameRooms = [];
let players = []
let messages = [];
let messageId = 0;
let playerOrder = 1;
let readyPlayers = [];
let canStart = false;
let game = [];
let errors = [];
let loggedInUsers = [];
let deck;
class Deck {
    constructor(){
      this.total = 0;
      this.colors = ['red', 'green', 'yellow', 'blue'];
      this.deck = [];
      this.shuffledDeck = [];
    }
    create(){
      for(let i = 0; i < this.colors.length; i++){
        for(let j = 0; j < 13; j++){
          let card = {
            color: this.colors[i],
            val: j+1
          }
          this.deck.push(card);
        }
      }
      this.total = this.deck.length;
    }
    shuffle(){
      let num = 52;
      while(this.deck.length > 0){
        let rand = Math.floor(Math.random() * (Math.floor(this.deck.length) - Math.ceil(0)) + Math.ceil(0));
        let randCard = this.deck[rand];
        this.shuffledDeck.push({
          color: this.deck[rand].color,
          val: this.deck[rand].val
        });
        this.deck.splice(rand, 1);              
      }
    }

    getShuffledDeck(){
      return this.shuffledDeck;
    }
    deal(players){}
}
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
 * Get Routes
 */
    app.get('/', (req, res) => {
        // if(loggedInUsers.length === 0){
        //     res.sendFile(path.join(__dirname, 'loggedIn.html'));
        //     //res.sendFile(path.join(__dirname, 'index.html'));
        // }
        // else{
        //     res.sendFile(path.join(__dirname, 'loggedIn.html'));
        // }
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/tic', (req, res) => {
        res.sendFile(path.join(__dirname, 'tictactoe.html'));
    });

    app.get('/crazy', (req, res) => {
        res.sendFile(path.join(__dirname, 'crazyIndex.html'));
    });

/**
 * Post Routes
 */
    app.post('/login', async (req, res) => {
        const errors = [];
        const selectQuery = 'SELECT * FROM users WHERE username = $1';
        const selectResult = await db.query(selectQuery, [req.body.username]);
        if (selectResult.rows.length === 1) {
            const auth = await bcrypt.compare(req.body.password, selectResult.rows[0].password);
            if (auth) {
                res.sendFile(path.join(__dirname, 'loggedIn.html'));
            } else {
                errors.push('Incorrect username/password');
                res.sendFile(path.join(__dirname, 'index.html'));
            }
            } else {
                errors.push('Incorrect username/password');
                res.sendFile(path.join(__dirname, 'index.html'));
            }
    });
    app.post('/register', async (req, res) => {
        const errors = [];
        if (req.body.password !== req.body.passwordConf) {
          errors.push('The provided passwords do not match.');
        }
        if (!(req.body.email && req.body.username && req.body.password && req.body.passwordConf)) {
          errors.push('All fields are required.');
        }
        const username = [req.body.username];
        const email = [req.body.email];
        const selectQuery = 'SELECT * FROM users WHERE username = $1';
        const selectResult = await db.query(selectQuery, username);
        if (selectResult.rows.length > 0) {
          errors.push('That username is already taken.');
        }
        if (!errors.length) {
          const idQuery = 'SELECT id FROM users WHERE id IS NOT NULL';
          const idResult = await db.query(idQuery);
          const newId = idResult.rows.length + 1;
          const insertQuery = 'INSERT INTO users (id, username, password) VALUES ($1, $2, $3)';
          const password = await bcrypt.hash(req.body.password, 10);
          const name = req.body.name;
          const parameters = [newId, req.body.username, password];
          await db.query(insertQuery, parameters);
          loggedInUsers.push(username)
          res.sendFile(path.join(__dirname, 'loggedIn.html'));
          
        } else {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
      });

/**
 * /crazy NAMESPACE
 */
    io.of("/crazy").on('connection', (socket) => {
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
                        });
                    socket.broadcast.to(roomName).emit('updateOtherPlayersAfterJoin', { players });
                    console.log(players);
                }
                else{
                    socket.emit('err', { type:'roomNotFound', message: 'Sorry, room doesn\'t exist'});
                }
            });
        /**
         * emit playerReady from client
         */
            socket.on('playerReady', (data) => {
                const { username, order, socketId, room, buttonId } = data; 
                const findObj = players.findIndex(item => item.socketId === socket.id);
                if(buttonId == order){
                    players[findObj].ready = true;
                    readyPlayers.push({
                        socketId: socket.id,
                        name: players[findObj].username,
                        order: players[findObj].order
                    });
                    if(readyPlayers.length === 2){
                        canStart = true;
                        socket.emit('canStartGame', canStart);
                        socket.broadcast.to(room).emit('updateOthersCanStartGame', canStart);
                    }
                    else{
                        canStart = false;
                        socket.emit('canStartGame', canStart);
                        socket.broadcast.to(room).emit('updateOthersCanStartGame', canStart);
                    }
                    socket.emit('playerReadyUp', { players, readyPlayers, canStart });
                    socket.broadcast.to(room).emit('updatePlayersAfterReady', { players, readyPlayers, canStart });
                }
                else{
                    socket.emit('err', { type: 'permissionDenied', message: 'You can\'t ready up for another player'});
                }  
            });
        /**
         * Player Unready
         */
            socket.on('playerUnready', (data) => {
                const { username, order, socketId, room, buttonId } = data; 
                const findObj = players.findIndex(item => item.socketId === socket.id);
                //console.log(`\n\n`)
                //console.log(findObj);
                if(buttonId == order){
                    players[findObj].ready = false;
                    readyPlayers.splice(findObj, 1);
                    if(readyPlayers.length === 2){
                        canStart = true;
                        socket.emit('canStartGame', canStart);
                        socket.broadcast.to(room).emit('updateOthersCanStartGame', canStart);
                    }
                    else{
                        canStart = false;
                        socket.emit('canStartGame', canStart);
                        socket.broadcast.to(room).emit('updateOthersCanStartGame', canStart);
                    }
                    socket.emit('playerUnready', { players, readyPlayers, canStart });
                    socket.broadcast.to(room).emit('updatePlayersAfterUnready', { players, readyPlayers, canStart });
                }
                else{
                    socket.emit('err', { type: 'permissionDenied', message: 'You can\'t unready for another player, or ready them idk how well this validates'});
                } 
            });
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
            });
        /**
         * START GAME connections
         */
            //Initial start game, updates UIs with board
            socket.on('startGame', (data) => {
                let numOfPlayers = players.length;
                deck = new Deck();
                deck.create()
                deck.shuffle();
                let shuffled = deck.getShuffledDeck();
                for(let i = 0; i < players.length; i++){
                    for(let j = 0; j < 8; j++){
                        players[i].cards.push(shuffled[j]);
                        shuffled.splice(j, 1);
                    }
                }
                console.log(players);
                socket.emit('startGame', { players, shuffled });
                socket.broadcast.to(data.room).emit('updateOthersStartGame', { players, shuffled })
            });
















        /**
         * CERTAINLY NEEDS WORK
         * On player disconnection, or leaveRoom button clicked, emit disconnect
         * emit updateOtherRoomsAfterJoin, pass in players Arr
         */
            socket.on('leave', (data) => {
                const { username, order, socketId, room, buttonId } = data;
                const findObj = players.findIndex(item => item.socketId === socket.id);
                if(findObj > 0){
                    if(players[findObj].socketId === socket.id){
                        players.slice(findObj, 1);
                        socket.emit('leaveRoom', { players })
                        socket.broadcast.to(data.room).emit('updatePlayersAfterLeave', { players });
                    }
                    else{
                        socket.emit('err', { type: 'failedValidation', message: 'error thrown on check username when removing from server side players []'})
                    }
                }
                else{
                    socket.emit('err', { type: 'indexOutOfBounds', message: 'couldn\'t find correct object in players []'})
                }
                // let index;
                // for(let i = 0; i < players.length; i++){
                //     if(players[i].username === data.name){
                //         index = i;
                //     }
                // }
                // players.splice(index, 1);
                // socket.broadcast.to(data.room).emit('updatePlayersAfterLeave', { players });
            });

            socket.on('disconnect', (data) => {
                console.log(`${socket.id} disconnected`)
            })
    });
 




/**
 * Tic Tac Toe socket connections
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
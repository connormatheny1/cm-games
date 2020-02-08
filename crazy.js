(function init() {
    let player;
    let player2;
    let player3;
    let game;
    let deck;
    let players = [];
    let curUser;
  
    const socket = io.connect('https://cm-games.herokuapp.com/');
    //const socket = io.connect('http://localhost:5000');

    class Deck {
        constructor(players){
            this.players = players;
            this.total = 0;
            this.colors = ['red', 'green', 'yellow', 'blue'];
            this.deck = []
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
            console.log(this.deck)
            let shuffled = [];
            let num = 52;
            while(this.deck.length > 0){
                let rand = Math.floor(Math.random() * (Math.floor(this.deck.length) - Math.ceil(0)) + Math.ceil(0));
                console.log(rand)
                let randCard = this.deck[rand];
                console.log(randCard)
                shuffled.push({
                    color: this.deck[rand].color,
                    val: this.deck[rand].val
                });
                this.deck.splice(rand, 1);              
            }
            return shuffled;
        }

        deal(players){

        }
    }
  
    class Player {
      constructor(username, id, currentRoom) {
        this.username = username;
        this.currentTurn = false;
        this.cards = [];
        this.id = id;
        this.messagesSent = [];
        this.currentRoom = currentRoom;
      }
  
      static get wins() {
        return [7, 56, 448, 73, 146, 292, 273, 84];
      }
  
      getPlaysArr() {
        return this.playsArr;
      }
  
      // Set the currentTurn for player to turn and update UI to reflect the same.
      setCurrentTurn(turn) {
        this.currentTurn = turn;
        const message = turn ? 'Your turn' : 'Waiting for Opponent';
        $('#turn').text(message);
      }
  
      getUsername() {
        return this.username;
      }
  
      getPlayerType() {
        return this.type;
      }
  
      getCurrentTurn() {
        return this.currentTurn;
      }

      getCards(){
          return this.cards;
      }

      getCurrentRoom(){
        return this.currentRoom;
      }

      setMessagesSent(msg){
        this.messagesSent.push(msg);
      }
    }
  
    // roomId Id of the room in which the game is running on the server.
    class Game {
      constructor(roomId) {
        this.roomId = roomId;
        this.board = [];
        this.moves = 0;
      }
  
      // Create the Game board by attaching event listeners to the buttons.
      createGameBoard() {
        function tileClickHandler() {
          if (!player.getCurrentTurn() || !game) {
            alert('Its not your turn!');
            return;
          }
  
          if ($(this).prop('disabled')) {
            alert('This tile has already been played on!');
            return;
          }
  
          // Update board after your turn.
          game.playTurn(this);
          game.updateBoard(player.getPlayerType(), row, col, this.id);
  
          player.setCurrentTurn(false);
          player.updatePlaysArr(1 << ((row * 3) + col));
  
          game.checkWinner();
        }
  
        for (let i = 0; i < 3; i++) {
          this.board.push(['', '', '']);
          for (let j = 0; j < 3; j++) {
            $(`#button_${i}${j}`).on('click', tileClickHandler);
          }
        }
      }
      // Remove the menu from DOM, display the gameboard and greet the player.
      displayBoard(message) {
        $('.menu').css('display', 'none');
        $('.gameBoard').css('display', 'block');
        $('#userHello').html(message);
        this.createGameBoard();
      }
      /**
       * Update game board UI
       *
       * @param {string} type Type of player(X or O)
       * @param {int} row Row in which move was played
       * @param {int} col Col in which move was played
       * @param {string} tile Id of the the that was clicked
       */
      updateBoard(type, row, col, tile) {
        $(`#${tile}`).text(type).prop('disabled', true);
        this.board[row][col] = type;
        this.moves++;
      }
  
      getRoomId() {
        return this.roomId;
      }
  
      // Send an update to the opponent to update their UI's tile
      playTurn(tile) {
        const clickedTile = $(tile).attr('id');
  
        // Emit an event to update other player that you've played your turn.
        socket.emit('playTurn', {
          tile: clickedTile,
          room: this.getRoomId(),
        });
      }
      checkWinner() {
        const currentPlayerPositions = player.getPlaysArr();
  
        Player.wins.forEach((winningPosition) => {
          if ((winningPosition & currentPlayerPositions) === winningPosition) {
            game.announceWinner();
          }
        });
  
        const tieMessage = 'Game Tied :(';
        if (this.checkTie()) {
          socket.emit('gameEnded', {
            room: this.getRoomId(),
            message: tieMessage,
          });
          alert(tieMessage);
          location.reload();
        }
      }
  
      checkTie() {
        return this.moves >= 9;
      }
  
      // Announce the winner if the current client has won. 
      // Broadcast this on the room to let the opponent know.
      announceWinner() {
        const message = `${player.getPlayerName()} wins!`;
        socket.emit('gameEnded', {
          room: this.getRoomId(),
          message,
        });
        alert(message);
        location.reload();
      }
  
      // End the game if the other player won.
      endGame(message) {
        alert(message);
        location.reload();
      }
    }

    $('#createDeck').on('click', () => {
      deck = new Deck(1);
      deck.create();
      $('.gameBoard').css('display', 'block');
      for(let i = 0; i < deck.deck.length; i++){
        let div = document.createElement('div');
        div.classList += 'card';
        let color = document.createElement('p');
        let value = document.createElement('p');
        color.textContent = deck.deck[i].color;
        value.textContent = deck.deck[i].val;
        div.style.backgroundColor = deck.deck[i].color;
        div.append(color);
        div.append(value);
        $('.table').append(div);
      }
    })
    
    $('#shuffleDeck').on('click', () => {
      let cards = deck.shuffle();
      document.querySelector('.table').innerHTML = '';
      for(let i = 0; i < cards.length; i++){
        let div = document.createElement('div');
        div.classList += 'card';
        let color = document.createElement('p');
        let value = document.createElement('p');
        color.textContent = cards[i].color;
        value.textContent = cards[i].val;
        div.style.backgroundColor = cards[i].color;
        div.append(color);
        div.append(value);
        $('.table').append(div);
      }
    });

    /**
     * Create new room
     */
    $('#newRoom').on('click', () => {
      const roomName = $("#createRoom").val();
      const username = $("#username").val();
      let cleanName;
      if(!roomName){
        alert('Please enter a room name')
        return
      }
      if(!username){
        alert('Please enter a username');
        return;
      }
      socket.emit('createRoom', { roomName, username })

      if(username.indexOf(' ') >= 0){
        cleanName = username.replace(/\s/g, "").toLowerCase();
        player = new Player(username, cleanName, roomName);
      }
      else{
        player = new Player(username, username, roomName);
      }

      console.log(player);
    });

    /**
     * Join existing room
     */
    $("#joinRoom").on("click", () => {
      const roomName = $("#roomNameJoin").val();
      const username = $("#usernameJoin").val();
      let cleanName;

      if(!roomName){
        alert('Please enter a room name')
        return
      }
      if(!username){
        alert('Please enter a username');
        return;
      }

      socket.emit('joinRoom', { username, roomName });

      if(username.indexOf(' ') >= 0){
        cleanName = username.replace(/\s/g, "").toLowerCase();
        player = new Player(username, cleanName, roomName);
      }
      else{
        player = new Player(username, username, roomName);
      }
    });

    /**
     * Leave a room
     */
    $("#leave-room").on("click", () => {
      socket.emit('disconnect');
      $('.menu').css('display', 'block');
      $('.room').css('display', 'none');
    })

    /**
     * Send a message
     */
    $("#sendMessage").on("click", () => {
      const message = $("#message").val();

      if(!message){
        alert('Enter a message')
        return;
      }
      
      socket.emit('message', ({ message, from: player.getUsername(), room: player.getCurrentRoom() }));

      $("#message").val('');
    });

    /**
     * isTyping
     */

    $("#message").keyup( () => {
      const name = player.getUsername();
      const room = player.getCurrentRoom();
      socket.emit('isTyping', { name, room });
    })

    socket.on('message', (data) => {
      const markup = `
        <li>
          <p>${data.from}: ${data.message}</p>
        </li>
      `;

      const oddMarkup = `
        <li class="odd">
        <p>${data.from}: ${data.message}</p>
        </li>
      `;

      const messages = document.getElementById('chat-log').getElementsByTagName('li')
      if(messages.length % 2 === 1){
        $("#chat-log").append(oddMarkup);
      }
      else{
        $("#chat-log").append(markup);
      }
      if($("#isTyping").css("display") == "inline"){
        $("#isTyping").css("display", "none")
      }

    })

    /**
     * Create a new room for the game
     */
    socket.on('newRoom', (data) => {
      const heading = `Room: ${data.roomName}`;
      const name = `Created by: ${data.username}`;
      $('.menu').css('display', 'none');
      $('.room').css('display', 'flex');
      $('#room-heading').html(heading);
      $('#roomCreator').html(name);
      $("#actual-num").html(data.players.length);
      for(i = 0; i < data.players.length; i++){
        let name = data.players[i].username;
        let status = data.players[i].ready ? "Ready" : "Join";
        let markup = `
          <li class="player-item">
            <div class="player-icon">
              <div></div>
            </div>
            <p class="player-item-name">${name}</p>
            <div class="player-status">
              <button class="status-text">${status}</button>
            </div>
          </li>
        `
        $("#player-list").append(markup);
      }
    });

    /**
     * Have player join room
     */
    socket.on('newPlayerJoins', (data) => {
      const heading = `Room: ${data.roomName}`;
      const name = `Created by: ${data.players[0].username}`;
      $('.menu').css('display', 'none');
      $('.room').css('display', 'flex');
      $('#room-heading').html(heading);
      $('#roomCreator').html(name);
      $("#actual-num").html(data.players.length);
      for(i = 0; i < data.players.length; i++){
        let name = data.players[i].username;
        let status = data.players[i].ready ? "Ready" : "Join";
        let markup = `
          <li class="player-item">
            <div class="player-icon">
              <div></div>
            </div>
            <p class="player-item-name">${name}</p>
            <div class="player-status">
              <button class="status-text">${status}</button>
            </div>
          </li>
        `
        $("#player-list").append(markup);
      }
    });

    socket.on('updateOtherRoomsAfterJoin', (data) => {
      $("#actual-num").html(data.players.length);
      $("#player-list").empty();
      for(i = 0; i < data.players.length; i++){
        let name = data.players[i].username;
        let status = data.players[i].ready ? "Ready" : "Join";
        let markup = `
          <li class="player-item">
            <div class="player-icon">
              <div></div>
            </div>
            <p class="player-item-name">${name}</p>
            <div class="player-status">
              <button class="status-text">${status}</button>
            </div>
          </li>
        `;
        
        $("#player-list").append(markup);
      }
    });

    /**
     * on istyping evt from server
     */
    socket.on('isTyping', (data) => {
        const who = `${data.name} is typing...`
        $("#isTyping").html(who);
        $("#isTyping").css("display", "inline");

        setTimeout(() => {
          $("#isTyping").css("display", "none");
        }, 2000)

    })


    /**
       * Opponent played his turn. Update UI.
       * Allow the current player to play now. 
       */
    socket.on('turnPlayed', (data) => {
      const row = data.tile.split('_')[1][0];
      const col = data.tile.split('_')[1][1];
      const opponentType = player.getPlayerType() === P1 ? P2 : P1;

      game.updateBoard(opponentType, row, col, data.tile);
      player.setCurrentTurn(true);
    });

    // If the other player wins, this event is received. Notify user game has ended.
    socket.on('gameEnd', (data) => {
      game.endGame(data.message);
      socket.leave(data.room);
    });

  
    /**
       * End the game on any err event. 
       */
    socket.on('err', (data) => {
      game.endGame(data.message);
    });
  }());
  
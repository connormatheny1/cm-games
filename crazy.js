(function init(){
  //INITIAL VARIABLE DECLARATIONS
      let player, game, deck;
      let errors = [];
      //const socket = io.connect('http://localhost:5000/crazy');
      const socket = io.connect('https://cm-games.herokuapp.com/crazy');


   //CLASS DECLARATIONS
      //Deck
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

      //Player
      class Player {
          constructor(username, id, currentRoom) {
          this.username = username;
          this.currentTurn = false;
          this.cards = [];
          this.id = id;
          this.messagesSent = [];
          this.currentRoom = currentRoom;
          this.ready = false;
          this.socketId = '';
          this.order = 0;
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
  
          getReady(){
          return this.ready;
          }
  
          setReady(bool){
          this.ready = bool;
          }
  
          getSocketId(){
          return this.socketId;
          }
  
          setSocketId(id){
          this.socketId = id;
          }
  
          getOrder(){
          return this.order
          }
  
          setOrder(num){
          this.order = num;
          }
      }

      //Game
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


  //UI INTERACTIONS
      //ROOM CREATE, JOIN, LEAVE
      /**
       * CREATE ROOM
       * Create new room on create room button click
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
      
              if(username.indexOf(' ') >= 0){
                cleanName = username.replace(/\s/g, "").toLowerCase();
                player = new Player(username, cleanName, roomName);
              }
              else{
                player = new Player(username, username, roomName);
              }
      
              socket.emit('createRoom', { roomName, username, player })
              console.log(player)
          });
      /**
       * JOIN ROOM
       * Join an existing room based on input on join room button click
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
      
              if(username.indexOf(' ') >= 0){
                cleanName = username.replace(/\s/g, "").toLowerCase();
                player = new Player(username, cleanName, roomName);
              }
              else{
                player = new Player(username, username, roomName);
              }
              socket.emit('joinRoom', { username, roomName, player });
          });
      /**
       * LEAVE A ROOM
       * Leave a room on leave room button click, 
       * emit UI update to remove from player list in other socket clients
       */
          $("#leave-room").on("click", () => {
              socket.emit('leave', {name: player.getUsername(), room: player.getCurrentRoom()});
              $('.menu').css('display', 'block');
              $('.room').css('display', 'none');
              player = null;
          });

      //CHAT
      /**
       * SEND MESSAGE
       * Sends message on send message button click
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
       * IS TYPING
       */
          $("#message").keyup( () => {
              const name = player.getUsername();
              const room = player.getCurrentRoom();
              socket.emit('isTyping', { name, room });
          });
      
      //READY/UNREADY
      /**
       * PLAYER READY
       * Player readies up in the lobby on join button click
       */

  //¿HELPER FUNCTIONS?
      //add a player to the player list
      createPlayerElement = (data) => {
        const { players } = data;
        for(let i = 0; i < players.length; i++){
          let name = players[i].username;
          let status = players[i].ready ? "Ready" : "Join";
          let li = document.createElement('li');
          li.classList += "player-item";
          let iconDiv = document.createElement('div');
          iconDiv.classList += "player-icon";
          let div = document.createElement('div');
          let nameP = document.createElement('p');
          nameP.classList += "player-item-name";
          nameP.innerHTML = `${players[i].username}`;
          let button = document.createElement('button');
          button.classList += "status-text";
          button.id = players[i].order;
          button.innerHTML = status;
          button.addEventListener("click", function(ele){
            //if(players[i].)
              socket.emit('playerReady', {
                ele,
                username: player.getUsername(),
                order: player.getOrder(),
                socketId: player.getSocketId(),
                room: player.getCurrentRoom(),
                buttonId: ele.target.attributes[1].value
              })
              console.log(player.getOrder());
              console.log(ele.target.attributes[1].value)
          });

          if(players[i].ready){
            if(!button.classList.contains('playerReady')){
              button.classList += ' playerReady'
            }
            else{
              button.classList.remove('playerReady')
            }
          }
          else{
            if(button.classList.contains('playerReady')){
              button.classList.remove('playerReady')
            }
          }

          iconDiv.append(div)
          li.append(iconDiv)
          li.append(nameP)
          li.append(button);
          $("#player-list").append(li);
        }
      }


  //UI UPDATES
      //ROOM CREATE, JOIN, LEAVE
      /**
       * CREATE ROOM
       * Update Client UI after creating a new room
       */
          socket.on('newRoom', (data) => {
              const heading = `Room: ${data.roomName}`;
              const name = `Created by: ${data.username}`;
              player.setSocketId(data.players[0].socketId);
              $('.menu').css('display', 'none');
              $('.room').css('display', 'flex');
              $('#room-heading').html(heading);
              $('#roomCreator').html(name);
              $("#actual-num").html(data.players.length);
              $("#player-list").empty();
              createPlayerElement(data)
          });
      /**
       * JOIN ROOM
       * Update Client UI after joining an existing room
       */
          socket.on('newPlayerJoins', (data) => {
              const heading = `Room: ${data.roomName}`;
              const name = `Created by: ${data.owner}`;
              const playersNum = data.players.length;
              player.setOrder(data.order);
              player.setSocketId(data.socketId);
              $('.menu').css('display', 'none');
              $('.room').css('display', 'flex');
              $('#room-heading').html(heading);
              $('#roomCreator').html(name);
              $("#actual-num").html(data.players.length);
              $("#player-list").empty();
              createPlayerElement(data)
          });

      /**
       * UPDATE OTHER PLAYERS AFTER JOIN
       * Update all other players UI after new player joins existing room
       */
          socket.on('updateOtherPlayersAfterJoin', (data) => {
              $("#actual-num").html(data.players.length);
              $("#player-list").empty();
              createPlayerElement(data);
          });
      /**
       * UPDATE OTHER PLAYERS AFTER LEAVE
       * Update all other players UI after a player leaves the room
       */
          socket.on('updatePlayersAfterLeave', (data) => {
              $("#actual-num").html(data.players.length);
              $("#player-list").empty();
              createPlayerElement(data);
          });

      //CHAT
      /**
       * UPDATE ON NEW MESSAGE
       * Update all UIs after a message is sent to the room
       */
          socket.on('message', (data) => {
            let li = document.createElement('li');
            let p = document.createElement('p');
            p.innerHTML = `${data.from}: ${data.message}`;
            li.append(p);

            const messages = document.getElementById('chat-log').getElementsByTagName('li');

            if(messages.length % 2 === 1){
              li.classList += "odd"
              $("#chat-log").append(li);
            }
            else{
              $("#chat-log").append(li);
            }
            if($("#isTyping").css("display") == "inline"){
                $("#isTyping").css("display", "none")
            }
          });
      /**
       * UPDATE ON IS TYPING
       * Update all UIs if a player is typing in the chat
       */
          socket.on('isTyping', (data) => {
              const who = `${data.name} is typing...`
              $("#isTyping").html(who);
              $("#isTyping").css("display", "inline");
      
              setTimeout(() => {
                  $("#isTyping").css("display", "none");
              }, 2000)
          });
      
      //READY/UNREADY
      /**
       * PLAYER READY
       * Player readies up in the lobby on join button click
       */
          socket.on('playerReadyUp', (data) => {
            $("#player-list").empty();
            createPlayerElement(data);
          });

          socket.on('updatePlayersAfterReady', (data) => {
            $("#player-list").empty();
            createPlayerElement(data);
          })




  //DECK MANIPULATION FUNCTIONS
      /**
       * CREATE DECK
       * Create a deck of cards
       */
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
          });
      /**
       * SHUFFLE DECK
       * Shuffle a deck of cards
       */
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



  //ERRORS
      /**
       * ROOM NOT FOUND
       * Alert client if the requested room doesn't exist
       */
          socket.on('err', (data) => {
              //game.endGame(data.message);
              const { message, type } = data;
              errors.push({
                  type: type,
                  message: message
              });
      
              if(type === 'roomNotFound'){
                  alert(`Type: ${type}\nMessage: ${message}\n`);
                  $("#usernameJoin").val("");
                  $("#roomNameJoin").val("");
                  $("#usernameJoin").focus();
              }

              if(type === 'permissionDenied'){
                alert(`Type: ${type}\nMessage: ${message}\n`);
              }
          });
}());
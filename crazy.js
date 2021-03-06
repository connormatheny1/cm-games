(function init(){
  //INITIAL VARIABLE DECLARATIONS
      let player, game, deck;
      let gameHasStarted = false;
      let errors = [];
      let currentCard;
      let player1;
      //const socket = io.connect('http://localhost:5000/crazy');
      const socket = io.connect('https://cm-games.herokuapp.com/crazy');

   //CLASS DECLARATIONS
    //Deck
      
      class Card {
        constructor(){}

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


          addCard(o){
            this.cards.push(o);
          }

          playCard(i){
            this.cards.splice(i, 1);
          }

          setCards(newCards){
            this.cards = newCards;
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
          constructor(players, deck) {
            this.players = players;
            this.deck = deck;
            this.cards = this.deck
            this.currentTurn;
          }
      
          // Create the Game board by attaching event listeners to the buttons.
          createGameBoard() {}
          // Remove the menu from DOM, display the gameboard and greet the player.
          displayBoard() {
            const message = 'Game in Progress';
            $("#inprogress").css("display", "flex");
            $("#game-in-progress").html(`${message}`)
            $(".notStarted").css("display", "none");
            $(".started").css("display", "flex");
          }

          dealToPlayers (num) {

          }

          getCurrentTurn(){
            return this.currentTurn;
          }

          setCurrentTurn(ele){
            this.currentTurn = ele;
          }

          getPlayers(){
            return this.players
          }

          setPlayers(players){
            this.players = players
          }

          getDeck(){
            return this.deck;
          }

          drawCard(){
            let r = this.deck[0]
            this.deck.splice(0, 1);
            return r;
          }

          getGameCards(){
            return this.cards;
          }

          setGameCards(a){
            this.cards = null;
            this.cards = a;
          }

          setDeck(p){
            this.deck = p;
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
     //leave shit was here 2

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

    //START GAME
      /**
       * Start the game if enough players are ready/button isn't disabled on start game button click
       */
        $("#start-game").on("click", () => {
          if($(this).prop("disabled")){
            alert('cant start game, probably because everyone isn\'t ready');
            return;
          }
          else if(gameHasStarted){
            alert('games has already started');
            return;
          }
          else{
            socket.emit('startGame', { room: player.getCurrentRoom(), game: game });
            gameHasStarted=true;
          }
        });

      /**
       * LEAVE A ROOM
       * Leave a room on leave room button click, 
       * emit UI update to remove from player list in other socket clients
       */
        $("#leave-room").on("click", () => {
            socket.emit('leave', {
              username: player.getUsername(),
              order: player.getOrder(),
              socketId: player.getSocketId(),
              room: player.getCurrentRoom()
            });
            $("#player-list").empty();
            $('.menu').css('display', 'block');
            $('.room').css('display', 'none');
            
        });
      
      
  //¿HELPER FUNCTIONS?
    //Build ready players list
      buildReadyPlayers = (data) => {
        const { readyPlayers } = data;
        console.log(readyPlayers)
        for(let i = 0; i < readyPlayers.length; i++){
          let name = readyPlayers[i].username;
          let li = document.createElement('li');
          li.innerHTML = name;
          $("#ready-players-list").append(li);
        }
      }
    //Build the player list
      createPlayerElement = (data) => {
        console.log(data)
        const { players } = data;
        console.log(players)

        if(data.length <= 1){
          for(let i = 0; i < data.length; i++){
            let name = data[i].username;
            let status = data[i].ready ? "Ready" : "Join";
            let li = document.createElement('li');
            li.classList += "player-item";
            let iconDiv = document.createElement('div');
            iconDiv.classList += "player-icon";
            let div = document.createElement('div');
            let nameP = document.createElement('p');
            nameP.classList += "player-item-name";
            nameP.innerHTML = `${data[i].username}`;
            let button = document.createElement('button');
            button.classList += "status-text";
            button.id = data[i].order;
            button.innerHTML = status;
            button.addEventListener("click", function(ele){
              if(!data[i].ready){
                socket.emit('playerReady', {
                  ele,
                  username: player.getUsername(),
                  order: player.getOrder(),
                  socketId: player.getSocketId(),
                  room: player.getCurrentRoom(),
                  buttonId: ele.target.attributes[1].value
                });
                console.log(player.getOrder());
                console.log(ele.target.attributes[1].value)
              }
              else{
                socket.emit('playerUnready', {
                  username: player.getUsername(),
                  order: player.getOrder(),
                  socketId: player.getSocketId(),
                  room: player.getCurrentRoom(),
                  buttonId: ele.target.attributes[1].value
                });
                console.log(player.getOrder());
                console.log(ele.target.attributes[1].value)
              }
            });
  
            if(data[i].ready){
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
        else{
          console.log(data.length)
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
              if(!players[i].ready){
                socket.emit('playerReady', {
                  ele,
                  username: player.getUsername(),
                  order: player.getOrder(),
                  socketId: player.getSocketId(),
                  room: player.getCurrentRoom(),
                  buttonId: ele.target.attributes[1].value
                });
                console.log(player.getOrder());
                console.log(ele.target.attributes[1].value)
              }
              else{
                socket.emit('playerUnready', {
                  username: player.getUsername(),
                  order: player.getOrder(),
                  socketId: player.getSocketId(),
                  room: player.getCurrentRoom(),
                  buttonId: ele.target.attributes[1].value
                });
                console.log(player.getOrder());
                console.log(ele.target.attributes[1].value)
              }
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
      }
    //Populate players cards
      populateCards = (hand, ele) => {
        if(ele === "#opponent-cards"){
          $("#opponent-cards").empty()
          if(hand.length == 1 || null){
            let div = document.createElement('div');
            div.classList += 'card flipped';
            let color = document.createElement('p');
            let value = document.createElement('p');
            div.append(color);
            div.append(value);
            $(ele).append(div);
          }
          else{
            for(let i = 0; i < hand.length; i++){
              let div = document.createElement('div');
              div.classList += 'card flipped';
              let color = document.createElement('p');
              let value = document.createElement('p');
              div.append(color);
              div.append(value);
              $(ele).append(div);
            }
          }
        }
        else{
          $("#my-cards").empty();
          if(hand.length === 0 || null){
            let div = document.createElement('div');
              div.classList += 'card';
              if(hand.val === currentCard.val || hand.color === currentCard.color){
                div.classList += ' playable';
                div.addEventListener("click", function(e){
                  const ele = e.target || e.srcElement;
                  if(!player.getCurrentTurn()){
                    alert('not your turn')
                  }
                  else{
                    playCard(ele, j, player.getUsername());
                  }
                })
              }
              else{
                div.classList += ' unplayable';
              }
              let color = document.createElement('p');
              let value = document.createElement('p');
              color.textContent = hand.color;
              value.textContent = hand.val;
              div.style.backgroundColor = hand.color;
              div.append(color);
              div.append(value);
              $(ele).append(div);
              $("#draw-card").css("display", "flex")
          }
          else{
            for(let j = 0; j < hand.length; j++){
              let div = document.createElement('div');
              div.classList += 'card';
              if(hand[j].val === currentCard.val || hand[j].color === currentCard.color){
                div.classList += ' playable';
                div.addEventListener("click", function(e){
                  const ele = e.target || e.srcElement;
                  if(!player.getCurrentTurn()){
                    alert('not your turn')
                  }
                  else{
                    playCard(ele, j, player.getUsername());
                  }
                })
              }
              else{
                div.classList += ' unplayable';
              }
              let color = document.createElement('p');
              let value = document.createElement('p');
              color.textContent = hand[j].color;
              value.textContent = hand[j].val;
              div.style.backgroundColor = hand[j].color;
              div.append(color);
              div.append(value);
              $(ele).append(div);
              $("#draw-card").css("display", "flex")
            }
          }
          // if(playables === 0){
          //   $("#unplayed-cards").first().addClass("playable");
          //   $("#unplayed-cards").first().on("click", (e) => {
          //     const ele = e.target || e.srcElement
          //     drawCard(ele, player.getUsername());
          //   });
          // }
        }
      }

      populateFirstCard = (card) => {
        let value = card.val;
        let color = card.color;
        let div = document.createElement('div');
        let p = document.createElement('p');
        let p1 = document.createElement('p');
        p.textContent = color;
        p1.textContent = value;
        div.append(p);
        div.append(p1);
        $("#last-played").css("background-color", color);
        $("#last-played").append(div);
      }

      populateUnplayedDeck = (cards) => {
        $("#unplayed-cards").empty()
        for(let i = 0; i < cards.length; i++){
          
          let div = document.createElement('div');
          let p = document.createElement('p');
          p.textContent = "DRAW";
          div.append(p);
          div.style.zIndex = ((cards.length + 1) - i);
          if(i === 0){
            div.classList += "drawable";
            div.addEventListener("click", function(e){
              const ele = e.target || e.srcElement;
              if(!player.getCurrentTurn()){
                alert('not your turn')
              }
              else{
                drawCard(ele, i, player.getUsername());
              }
            })
          }
          $("#unplayed-cards").css("background-color", "purple");
          $("#unplayed-cards").append(div)
        }
      }

  //GAMEPLAY UI INTERACTIONS
      playCard = (ele, index, p, card) => {
        console.log(ele)
        console.log(index)
        currentCard = player.getCards()[index];
        const newCard = currentCard;
        console.log(currentCard)
        socket.emit("playCard", {
          ele,
          index, 
          newCard,
          order: player.getOrder(),
          room: player.getCurrentRoom(),
          p: p
        });
        player.playCard(index);
        player.setCurrentTurn(false);
        $("#your-turn").css("display", "none")
        $("#my-cards").html(populateCards(player.getCards(), "#my-cards"));
        $("#last-played").empty()
        populateFirstCard(currentCard);
      }

      drawCard = (ele, p) => {
        if(game.deck.length === 1){
          socket.emit('replenishDeck');
        }

        let c = game.drawCard();
        player.addCard(c)
        console.log(c);
        console.log(player.getCards())
        player.setCurrentTurn(false);
        populateCards(player.getCards(), "#my-cards");
        populateUnplayedDeck(game.deck)
        $("#your-turn").css("display", "none");
        socket.emit("drawCard", {
          ele,
          card: c,
          order: player.getOrder(),
          room: player.getCurrentRoom(),
          newDeck: game.deck,
          p: p
        });
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
      //leave shit was here 1
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
            const { readyPlayers, canStart } = data;
            player.setReady(true)
            $("#player-list").empty();
            createPlayerElement(data);
            $("#readyPlayers").html(readyPlayers.length)
            console.log('\n')
            console.log(player)
          });
      /**
       * PLAYER UNREADY
       * Player unreadies in lobby on button click
       */
          socket.on('playerUnready', (data) => {
            const { readyPlayers, canStart } = data;
            player.setReady(false)
            $("#player-list").empty();
            createPlayerElement(data);
            $("#readyPlayers").html(readyPlayers.length)
            console.log('\n')
            console.log(player)
          });
      /**
       * UPDATE OTHER PLAYERS ON READY UP
       * Update all players UI except sender of ready up
       */
          socket.on('updatePlayersAfterReady', (data) => {
            const { readyPlayers, canStart } = data;
            player.setReady(true)
            $("#player-list").empty();
            createPlayerElement(data);
            $("#readyPlayers").html(readyPlayers.length)
            console.log('\n')
            console.log(player)
          });
      /**
       * UPDATE OTHER PLAYER ON UNREADY
       * Update all players UI except sender of unready
       */
          socket.on('updatePlayersAfterUnready', (data) => {
            const { readyPlayers, canStart } = data;
            player.setReady(false)
            $("#player-list").empty();
            createPlayerElement(data);
            $("#readyPlayers").html(readyPlayers.length)
            console.log('\n')
            console.log(player)
          });
      /**
       * canStart
       */
          socket.on('canStartGame', (data) => {
            if(data){
              if($("#start-game").prop("disabled")){
                  $("#start-game").prop("disabled", false);
                  $("#start-game").addClass('enabled');
              }
            }
            else{
                if(!$("#start-game").prop("disabled")){
                    $("#start-game").prop("disabled", true);
                    $("#start-game").removeClass('enabled');
                }
            }
          })
      /**
       * Update other UIs on canStart
       */
          socket.on('updateOthersCanStartGame', (data) => {
            if(data){
              if($("#start-game").prop("disabled")){
                  $("#start-game").prop("disabled", false);
                  $("#start-game").addClass('enabled');
              }
            }
            else{
                if(!$("#start-game").prop("disabled")){
                    $("#start-game").prop("disabled", true);
                    $("#start-game").removeClass('enabled');
                }
            }
          })
      /**
       * START GAME shit
       */
          //Update clients UI
          socket.on('startGame', (data) => {
            const { players, shuffled, firstTurn, num, firstCard } = data;
            const name = player.getUsername();
            const order = player.getOrder()
            game = new Game(players, shuffled);
            player.setCards(players[0].cards);
            console.log(players);
            console.log(players[0].cards)
            console.log(players[1].cards)
            currentCard = firstCard;

            if(player.getUsername() === firstTurn.username){
              player.setCurrentTurn(true);
              $("#current-turn").html(player.getUsername())
            }
            else{
              player.setCurrentTurn(false)
              $("#current-turn").html(players[num].username)
            }

            if(player.getCurrentTurn()){
              $("#your-turn").css("display", "inline")
            }
            else{
              $("#your-turn").css("display", "none")
            }

            const findObj = players.findIndex(item => item.order !== order);

            if(order === findObj){
              $("#my-name").html(name);
              $("#opponent-name").html(players[findObj].username);
            }
            else{
              $("#my-name").html(`${players[order].username} (you)`);
              $("#opponent-name").html(players[findObj].username); 
            }
            
            $("#my-cards").html(populateCards(players[0].cards, '#my-cards'))
            $("#opponent-cards").html(populateCards(players[1].cards, '#opponent-cards'));
            
            populateFirstCard(firstCard);
            populateUnplayedDeck(game.deck);           
            
            game.displayBoard();
            console.log(game);
          });

          //Update other players UI
          socket.on('updateOthersStartGame', (data) => {
            const { players, shuffled, firstTurn, num, firstCard } = data;
            player.setCards(players[1].cards);
            const name = player.getUsername();
            game = new Game(players, shuffled);
            currentCard = firstCard;
            console.log(players);
            console.log(players[0].cards)
            console.log(players[1].cards);

            if(player.getUsername() === firstTurn.username){
              player.setCurrentTurn(true);
              $("#current-turn").html(player.getUsername())
            }
            else{
              player.setCurrentTurn(false)
              $("#current-turn").html(players[num].username)
            }

            if(player.getCurrentTurn()){
              $("#your-turn").css("display", "inline")
            }
            else{
              $("#your-turn").css("display", "none")
            }

            const findObj = players.findIndex(item => item.username === name);
            for(let i = 0; i < players.length; i++){
              if(i !== findObj){
                $("#my-name").html(`${players[findObj].username} (you)`);
                $("#opponent-name").html(players[i].username);
                break;
              }
              else{
                $("#my-name").html(players[i].username);
                $("#opponent-name").html(players[findObj].username);
                break;
              }
            }

            $("#opponent-cards").html(populateCards(players[0].cards, '#opponent-cards'))
            $("#my-cards").html(populateCards(players[1].cards, '#my-cards'))

            populateFirstCard(firstCard);
            populateUnplayedDeck(game.deck);
            
            game.displayBoard();
            console.log(game);
          });

      /**
       * GAMEPLAY UI UPDATES
       */
          socket.on('updateOthersCardPlayed', (data) => {
            const { ele, index, newCard, players, order } = data;
            currentCard = newCard;
            player.setCurrentTurn(true);
            $("#your-turn").css("display", "inline");
            $("#my-cards").html(populateCards(player.getCards(), "#my-cards"));
            $("#opponent-cards").html(populateCards(players[order].cards, "#opponent-cards"));
            $("#last-played").empty()
            populateFirstCard(currentCard);
          });

          

          socket.on("updateOthersDrewCard", (data) => {
            const { card, a, order, newDeck } = data;
            player.setCurrentTurn(true);
            game.setDeck(newDeck)
            $("#your-turn").css("display", "inline");
            $("#my-cards").html(populateCards(player.getCards(), "#my-cards"));
            $("#opponent-cards").html(populateCards(a, "#opponent-cards"));
            $("#last-played").empty()
            $("#unplayed-cards").empty();
            populateUnplayedDeck(game.deck);
            populateFirstCard(currentCard);
          });

          socket.on('newDeck', (data) => {
            game.setDeck(data.newDeck);
            populateUnplayedDeck(game.deck);
          })



    /**
     * LEAVE ROOM
     */
      socket.on("updatePlayerLeft", (data) => {
        const { players } = data;
        console.log(players);
        $("#actual-num").html(players.length);
        $("#player-list").empty();
        createPlayerElement(players);
      })

    /**
     * GAME WON
     */
        socket.on('gameWon', (data) => {
          const { winner } = data;
          if(player.getUsername() === winner){
            alert(`You won the game`);
          }
          else{
            alert(`${winner} won the game`)
          }
        });

        socket.on('updateOthersGameWon', (data) => {
          const { winner } = data;
          if(player.getUsername() === winner){
            alert(`You won the game`);
          }
          else{
            alert(`${winner} won the game`)
          }

        })




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

            if(type === 'failedValidation'){
              alert(`Type: ${type}\nMessage: ${message}\n`);
            }

            if(type === 'indexOutOfBounds'){
              alert(`Type: ${type}\nMessage: ${message}\n`);
            }
        });
}());






/**
       * LEAVE ROOM
       * Update UI after leaving the room
        socket.on('leaveRoom', (data) => {
          $("#actual-num").html(data.players.length);
          $("#player-list").empty();
          $('.menu').css('display', 'block');
          $('.room').css('display', 'none');
          player = null;
          createPlayerElement(data);
        })
      */
      /**
       * UPDATE OTHER PLAYERS AFTER LEAVE
       * Update all other players UI after a player leaves the room
        socket.on('updatePlayersAfterLeave', (data) => {
          $("#actual-num").html(data.players.length);
          $("#player-list").empty();
          $('.menu').css('display', 'block');
          $('.room').css('display', 'none');
          player = null;
          createPlayerElement(data);
        });
    */

     // socket.on("drewCard", (data) => {
          //   const { card, players, order, newDeck } = data;
          //   player.setCurrentTurn(false);
          //   //player.setCards(players[order].cards);
          //   game.setDeck(newDeck)
          //   $("#your-turn").css("display", "none")
          //   let other;
          //   if(order === 0){
          //     other = 1
          //   }
          //   else{
          //     other = 0;
          //   }

          //   $("#my-cards").empty()
          //   $("#opponent-cards").empty()
          //   $("#my-cards").html(populateCards(player.getCards(), "#my-cards"));
          //   $("#opponent-cards").html(populateCards(players[other].cards, "#opponent-cards"));
          //   $("#last-played").empty()
          //   populateUnplayedDeck(game.deck);
          //   populateFirstCard(currentCard);
          // })

          //Card Played
          // socket.on('cardPlayed', (data) => {
          //   const { ele, index, card, players, order } = data;
          //   currentCard = card;
          //   player.setCurrentTurn(false);
          //   player.setCards(players[order].cards)
          //   $("#your-turn").css("display", "none")
          //   let other;
          //   if(order === 0){
          //     other = 1
          //   }
          //   else{
          //     other = 0;
          //   }

          //   $("#my-cards").empty()
          //   $("#opponent-cards").empty()
          //   $("#my-cards").html(populateCards(player.getCards(), "#my-cards"));
          //   $("#opponent-cards").html(populateCards(players[other].cards, "#opponent-cards"));
          //   $("#last-played").empty()
          //   populateFirstCard(currentCard);
          // });
var rPs = {
    // firebase DB access
    config : {
        apiKey: "AIzaSyBf0gVHp5DOpZzAzqQLkmTeEncS_9ERags",
        authDomain: "rps-multi-wt.firebaseapp.com",
        databaseURL: "https://rps-multi-wt.firebaseio.com",
        projectId: "rps-multi-wt",
        storageBucket: "gs://rps-multi-wt.appspot.com/",
        messagingSenderId: "1039334913880"
    },
    database: "",
    numPlayers: 0,
    playerDesignation: "",
    playerDB : "",
    messagesDB: "",

    // Initializing firebase, the database, and messaging
    init: function() {

        firebase.initializeApp(rPs.config);
        database = firebase.database();
        playerDB = database.ref('players/');        //DB location for current  players
        messagesDB = database.ref('messages/');     //DB location to store chat messages
        rPs.clickHandlers();                        //Activate listeners
    },
    clickHandlers: function() {
        // Detect new player upon listener event
        $(".ready").on("click", function(e) {
            var curPlayer = $(e.target).attr("data-player");
            var enteredText = $('#' + curPlayer + ' .name').val().trim();
            if (enteredText == "") {                //Player name can't be blank
                alert("Please enter a valid name")
            } else {                            
                //player name is valid. Insert player into DB and update UI
                rPs.playerDesignation = curPlayer;
                rPs.players[rPs.playerDesignation] = new rPs.Player(enteredText);
                rPs.updatePlayers();
                var connectionsRef = database.ref("/players/"+rPs.playerDesignation);
                connectionsRef.set(rPs.players[rPs.playerDesignation]);
                //remove player from DB if they disconnect
                connectionsRef.onDisconnect(        //Delete user on disconnect
                    function () {
                        messagesDB.push(new rPs.Message(enteredText +
                            " has left the building.", 'admin'));
                    }).remove();
                $('.name').attr('disabled', true);  //Disallow new name entry
            }
        });

        //When player picks R, P, or S champion
        $(".move").on("click", function(e) {
            var curPlayer = $(e.target.offsetParent).attr('id');
            //add the move to player's 'last move' property
            rPs.players[curPlayer].lastMove = $(e.target).attr("data-move");
            //hide other moves until this round is over
            $('#' + rPs.playerDesignation + ' .move').not($(e.target)).hide();
            playerDB.set(rPs.players);              //send players to firebase
        });

        playerDB.on('value', function(data){
            if(data.val()==null){                   //Delete local data if nothing is in the DB
                players = { 
                    player1: null, 
                    player2: null 
                };
            }else{
                rPs.players = data.val();           //Get DB changes
                rPs.numPlayers = Object.keys(data.val()).length;
                if(rPs.numPlayers>1){               //If we have 2 playes
                    let moveFlag = true;
                    for(key in rPs.players){        //Verify that both players have made moves
                        if (rPs.players[key].lastMove === ""){
                            moveFlag=false;         
                            break;
                        }
                    }
                    if (moveFlag) {
                            rPs.getResult();        //Get result
                    }
                }     
                rPs.updatePlayers();                //Update UI
            }
        }, function(error){alert("Error! Cannot compute!")});

        /* Chatroom Functionality */
        messagesDB.on('child_added',                //Detect new msg
            function(data){    
                rPs.showMessage(data.val());        //Send to UI
            }, function(e){
            alert("You have been disconnected");
        });

        $('#send').on('click', function(e){
            e.preventDefault();                     //Prevent page refresh
            let message = $('#message-input').val().trim();
            if(message===""){
                alert("Cannot send blank message")  //Disallow blank messages
            } else{
                messagesDB.push(
                    new rPs.Message(message));      //Create message object and send to DB
            }
            $('#message-input').val("");            //Clear message box in UI
        });
        /* End Chatroom Functionality */
    },//End of clickHandlers

    updatePlayers: function() {
        $('.player-title').html("Player Name: ")
        $(' .form-group').slideDown();              // Show name input
        //update UI with all player info and disable R P S buttons for now
        for (curPlayer in rPs.players){
            if (rPs.players[curPlayer] != null){
                $('#' + curPlayer + ' .player-title').html("Player Name: " + 
                    rPs.players[curPlayer].name);
                $('#' + curPlayer + ' .win').html(rPs.players[curPlayer].wins);
                $('#' + curPlayer + ' .loss').html(rPs.players[curPlayer].losses);
                $('#' + curPlayer + ' .tie').html(rPs.players[curPlayer].ties);
                $('#' + curPlayer + ' .form-group').slideUp();
                $('.move-text').html("Waiting for another player");
                $('.moves :button').attr('disabled', true);   
                rPs.checkPlayers();
            }
        }
    },
    // Function to enable move buttons when we have 2 players
    checkPlayers: function() {
        for (key in rPs.players) {
            if (rPs.players[key] == null) {
                //player missing - disable all buttons
                $("#" + key + " .moves :button").attr('disabled', true);
            } else if (rPs.numPlayers > 1) {        //we  have our 2 players
                //only enable move buttons for current player
                $("#" + rPs.playerDesignation + " .moves :button").removeAttr('disabled');
                $('#' + key + ' .move-text').html("Make your move:");
                $('#' + key + ' .player-title').html("Player Name: " + rPs.players[key].name);
            }
        }
    }, // checkPlayers function

    // Make all buttons visible
    refresh: function(){
        $('.moves :button').show();
    },

    // Calculate who won the round based on each player's 'last move' property
    getResult: function() {
        rPs.refresh();
        if(rPs.players['player1'].lastMove === rPs.players['player2'].lastMove){
            rPs.winner('tied');
        } else {
            switch(rPs.players['player1'].lastMove){
                case 'rock':
                    if(rPs.players['player2'].lastMove === 'paper'){
                        rPs.winner('player2');
                    } else{rPs.winner('player1')}
                    break;
                case 'paper':
                    if(rPs.players['player2'].lastMove === 'scissors'){
                        rPs.winner('player2');
                    } else{rPs.winner('player1')}
                    break;
                case 'scissors':
                    if(rPs.players['player2'].lastMove === 'rock'){
                        rPs.winner('player2');
                    } else{rPs.winner('player1')}
                    break;
            }
        }
    },

    // Called by getResult to update wins and losses and show in UI
    winner: function(aPlayer){
        if (aPlayer === 'tied'){
            $('.result').html("You both tied with " + 
                rPs.players[rPs.playerDesignation].lastMove);
            for(curPlayer in rPs.players){
                rPs.players[curPlayer].lastMove = "";
                rPs.players[curPlayer].ties++;
            }
        } else{
            $('.result').html(rPs.players[aPlayer].name + " won with " + 
                rPs.players[aPlayer].lastMove);
            rPs.players[aPlayer].wins++;
            for(curPlayer in rPs.players){
                rPs.players[curPlayer].lastMove = "";
                if (curPlayer != aPlayer){
                    rPs.players[curPlayer].losses++;
                }
            }
        }
        rPs.refresh();                              //Enable move buttons
        playerDB.set(rPs.players);                  //Send new data to firebase
    },
    // Message styling
    showMessage: function(message){
        let style="";
        switch (message.sender){
            case 'anonymous':
                style = 'anonymous';
                break;
            case 'admin':
                style = 'anonymous';
                break;
            case rPs.playerDesignation:
                style = 'left';
                break;
            default:
                style = 'right';
        }
        // Add message to our messages list
        $('.messages ul').append($('<li class="li-' + style +'">').html(
            '<span class="li-message">' + message.message + '</span>' +
            '<span class="li-username">- ' + message.sender + " | " + 
            message.time + '</span>'));
        // Scroll to the bottom
        $(".messages").animate({scrollTop: $(".messages").prop("scrollHeight")}, 1000);
    },

    // Player class to hold player data
    Player: function(name) {
        this.name = name;
        this.wins = 0;
        this.losses = 0;
        this.ties = 0;
        this.lastMove = "";
    },
    // Message class to create objects for each message
    Message: function(chat, sender = 'anonymous') {
        if(sender!='admin'){
            if (rPs.playerDesignation != ""){
                sender = rPs.playerDesignation;
            }
        }
        this.sender = sender
        this.message = chat;
        this.time = new Date().toLocaleTimeString();
        console.log(this.sender +":"+ chat);
    },
    players: { player1: null, player2: null }
}//RPS Object

$(document).ready(function() {
    rPs.init();                     //Starts the game when the page is loaded
});


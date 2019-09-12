var config = {
	apiKey: "AIzaSyDU7Cddk_suODSN77BSaFAj5uSF7WDZc_A",
	authDomain: "multirps-9190a.firebaseapp.com",
	databaseURL: "https://multirps-9190a.firebaseio.com",
	projectId: "multirps-9190a",
	storageBucket: "multirps-9190a.appspot.com",
	messagingSenderId: "771308533274"
};

firebase.initializeApp(config);

var database = firebase.database(),
		rpsRef = firebase.database().ref('/rpsgames'),
		chatRef = firebase.database().ref('/chat'),
		connectionsRef = database.ref("/connections"),
		connectedRef = database.ref(".info/connected");

var pName = "",
		pNum = 0,
		pWins = 0,
		pLosses = 0,
		pChoice = "",
		player1 = "",
		player2 = "",
		active = false,
		dbTurn = 0,
		authorized = true,
		resume = true;


// Watch number of viewers
connectedRef.on('value', function(snap) {
	if (snap.val()) {
		var con = connectionsRef.push(true);
		con.onDisconnect().remove();
	}
});
connectionsRef.on('value', function(snap) {
	$("#game-players").text(snap.numChildren());
});

chatRef.on('child_added', function(snapshot) {
	var rpsChat = snapshot.val();
	rps.addChatMessage(rpsChat.num, rpsChat.name, rpsChat.message);
}, function(errorObject) {
	console.log("The read failed with code: " + errorObject.code);
});

//////////////////////////////////////

rpsRef.on('value',function(snapshot){

		var rpsGame = snapshot.val();
		var p1 = rpsGame.p1.active;
		var p2 = rpsGame.p2.active;
		var choice1 = rpsGame.p1.choice;
		var choice2 = rpsGame.p2.choice;
		player1 = rpsGame.p1.name;
		player2 = rpsGame.p2.name;
		dbTurn = rpsGame.turn;
		resume = rpsGame.resume;

		if (resume){
			$('.show-winner').addClass('hide');
			$('.rps').removeClass('selected');
			rps.updateTurnText();
		}

		if(p1 && p2){
			authorized = pName !== '';
			if (authorized){
				if( choice1 !== '' && choice2 !== ''){
					rps.calcWinner(choice1, choice2);
				} else {
					rps.updatePlayer(rpsGame.p1, 1);
					rps.updatePlayer(rpsGame.p2, 2);
				}
				rps.updateTurnText();
			} else {
				rps.resetPlayer(1);
				rps.resetPlayer(2);
			};
		} else if (!p1 && !p2){
			$('#chat').empty();
			chatRef.remove();
			rps.resetPlayer(1);
			rps.resetPlayer(2);
		} else {
			$('#busymsg').addClass('hide');
			if (p1){
				rps.updatePlayer(rpsGame.p1, 1);
			} else {
				rps.resetPlayer(1)
			};
			if (p2){
				rps.updatePlayer(rpsGame.p2, 2);
			} else {
				rps.resetPlayer(2)
			};
		};
}, function(errorObject) {
	console.log("The read failed: " + errorObject.code);
});

$('#send').click(function(event){
	event.preventDefault();
	var inputMessage = $('#message').val();
	if( inputMessage.length > 0 && pName !== ''){
		var rpsNo = pNum;
		var rpsNm = pName;
		var rpsMsg = $('#message').val();
		chatRef.push().set({
			num: rpsNo,
			name: rpsNm,
			message: rpsMsg
		});  	
	};
	$('#message').val('');
});

$('#start').click(function(event){
	event.preventDefault();
	var inputName = $('#player-name').val().trim();
	if( inputName.length > 0 ){
		pName = inputName;
		$('#startrow').addClass('hide');
		rps.startGame();
	};
});

$('.rps').click(function(event){
	if(dbTurn === pNum){
		pChoice = $(this).attr('data-value');
		$(this).addClass('selected');
		resume = false;
		if (dbTurn === 1){
			dbTurn = 2;
		} else {
			dbTurn = 1;
		}
		rps.updateDB();
	};
});

$('#play').click(function(event){
	event.preventDefault();
	dbTurn = 1;
	resume = true;
	rps.updateDB();
});

$('#nameinput').keypress(function(event) {
	if (event.which == 13){
		event.preventDefault();
		$('#start').trigger('click');
	}
});

$('#chatfrm').keypress(function(event) {
	if (event.which == 13){
		event.preventDefault();
		$('#send').trigger('click');
	}
});

var rps = {
	startGame: function(){
		rpsRef.once('value',function(snapshot){
			var data = snapshot.val();
			var p1Data = data.p1;
			var p2Data = data.p2;
			var p1 = p1Data.active;
			var p2 = p2Data.active;
			if (p1 && p2){
				rps.updatePlayer(p1Data, 1);
				rps.updatePlayer(p2Data, 2);			
				rps.setWait();
			} else if(p1){
				rps.setPlayer(2);
			} else {
				rps.setPlayer(1);
			};
		}, function(errorObject) {
			console.log("The read failed: " + errorObject.code);
		});		
	},

	setPlayer: function(player){
		active = true;
		pNum = player;
		pWins = 0;
		pLosses = 0;
		pChoice = "";
		if ( dbTurn === 0 ){
			dbTurn = pNum;
		};
		$('#wait' + player).addClass('hide');	
		$('#player' + player).removeClass('hide');
		$('#playername' + player).text(pName);
		$('#wins' + player).text(pWins);
		$('#losses' + player).text(pLosses);
		$('.rps' + player).removeClass('avoid-clicks');
		$('#namelbl').text('Hi ' + pName + '! You are Player ' + player);
		$('#rpsimg').addClass('hide');
		$('#play').removeClass('hide');
		$('#statusblock').removeClass('hide');
		rps.connectToGame();
		rps.updateDB();
	},

	resetPlayer: function(player){
		$('#wait' + player).removeClass('hide');	
		$('#player' + player).addClass('hide');
		$('.rps' + player).addClass('avoid-clicks');
		$('#turnlbl').text('');
		if(!active){
			$('#startrow').removeClass('hide');
			$('#rpsimg').removeClass('hide');
			$('#statusblock').addClass('hide');
		};
	},

	setWait: function(){
		$('#busymsg').text('Sorry ' + pName + '! Both players are playing right now. You can watch the game till one of the players leave.');
		$('#busymsg').removeClass('hide');
		$('#namelbl').text('You are watching this game!');
		$('#rpsimg').addClass('hide');
		$('#statusblock').removeClass('hide');
		$('.rps').addClass('avoid-clicks');
	},

	updatePlayer: function(data, pnumber){
		$('#wait' + pnumber).addClass('hide');	
		$('#player' + pnumber).removeClass('hide');
		$('#playername' + pnumber).text(data.name);
		$('#wins' + pnumber).text(data.wins);
		$('#losses' + pnumber).text(data.losses);
	},

	updateTurnText: function(){
		if( dbTurn === 0){
			$('#turnlbl').text('');
		} else {
			var otherPlayer = '';
			if (active){
				if (pNum === 1){
					otherPlayer = player2;
				} else {
					otherPlayer = player1;
				};
				if ( dbTurn === pNum){
					$('#turnlbl').text('It\'s Your Turn!');
				} else {
					$('#turnlbl').text('Waiting for ' + otherPlayer + ' to choose.');
				};
			} else {
				if (dbTurn === 1){
					player_name = player1;
				} else {
					player_name = player2;
				};
				$('#turnlbl').text('Waiting for ' + player_name + ' to choose.');
			};
		};
	},

	connectToGame: function(){
		var thisPlayer = '';
		if (pNum === 1){
			thisPlayer = 'p1';
		}else{
			thisPlayer = 'p2';
		}
		var activeRef = firebase.database().ref('/rpsgames/' + thisPlayer +'/active');
		var nameRef = firebase.database().ref('/rpsgames/' + thisPlayer +'/name');
		var choiceRef = firebase.database().ref('/rpsgames/' + thisPlayer +'/choice');
		var winsRef = firebase.database().ref('/rpsgames/' + thisPlayer +'/wins');
		var lossesRef = firebase.database().ref('/rpsgames/' + thisPlayer +'/losses');
		var resumeRef = firebase.database().ref('/rpsgames/resume');
		var turnRef = firebase.database().ref('/rpsgames/turn');
		activeRef.onDisconnect().set(false);
		nameRef.onDisconnect().set('');
		choiceRef.onDisconnect().set('');
		winsRef.onDisconnect().set(0);
		lossesRef.onDisconnect().set(0);
		resumeRef.onDisconnect().set(true);
		turnRef.onDisconnect().set(0);
	},

	addChatMessage: function(playerNo, pName, inputMessage){
		var $p = $('<p>').addClass('msg player' + playerNo)
			.text(pName + ': ' + inputMessage);
		$('#chat').append($p);
		var objDiv = document.getElementById("chat");
		objDiv.scrollTop = objDiv.scrollHeight;
	},

	calcWinner: function(p1, p2){
		var mix = p1 + p2;
		$('.rps1[data-value="' + p1 + '"]').addClass('selected');
		$('.rps2[data-value="' + p2 + '"]').addClass('selected');
		if(mix.length === 2){
			dbTurn = 0;
			pChoice = '';
			var result = 0;
			if(p1 === p2){
				result = 0;
			} else if( mix === "rs" || mix === "pr" || mix === "sp" ){
				result = 1;
			}else{
				result = 2;
			};
			if ( result !== 0){
				if (result === pNum){
					pWins++;
				} else {
					pLosses++;
				};
			};
			rps.drawResult(p1, p2, result);
			if (pNum !== 0){ rps.updateDB(); }
		};
	},

	drawResult: function(p1, p2, result){
		var	img1 = 'assets/images/';
		var	img2 = 'assets/images/';
		var winner = result === 0 ? 'Tie' : (result === 1 ? player1 : player2);
		var winnerText = result === 0 ? 'Game!' : 'Wins';

		if(result === 0){
			img1 = img1 + 'w' + p1 + '1.png';
			img2 = img2 + 'w' + p2 + '2.png';
		} else{
			img1 = img1 + (result === 1 ? 'w' : 'l') + p1 + '1.png';
			img2 = img2 + (result === 2 ? 'w' : 'l') + p2 + '2.png';
		};

		$('#choice1').attr('src', img1);
		$('#choice2').attr('src', img2);
		$('#winner').text(winner);
		$('#winnertxt').text(winnerText);
		$('.show-winner').removeClass('hide');
	},

	updateDB: function(){
		var player = 'p' + pNum;
		var updates = {};
		var playerData = {
			active: true,
			choice: pChoice,
			losses: pLosses,
			name: pName,
			wins: pWins
		};
		updates[player] = playerData;
		updates.turn = dbTurn;
		updates.resume = resume;
		rpsRef.update(updates);
	}
};

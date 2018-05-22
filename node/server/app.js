var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var config = require("./config.js");
//var port = process.env.PORT || 8110;
var port = 8110;
//var port = 3000;

var crypto = require("crypto");
const storage = require("node-persist");
const util = require("util");


// var streamSettings = {
// 	x1: 255 - 1920,
// 	x2: 1665 - 1920,
// 	y1: 70,
// 	y2: 855,
// 	fps: 15,
// 	quality: 60,
// 	scale: 30,
// };

//{x1: 319-1920, x2: 319+1280-1920, y1: 61, y2: 61+720}

var streamSettings = {
	x1: 319 - 1920,
  y1: 61,
	x2: 319 + 1280 - 1920,
	y2: 61 + 720,
	fps: 15,
	quality: 60,
	scale: 30,
};

var lastImage = "";


var session        = require('express-session');
var passport       = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request        = require('request');
var handlebars     = require('handlebars');

const TWITCH_CLIENT_ID = "mxpjdvl0ymc6nrm4ogna0rgpuplkeo";
const TWITCH_SECRET    = config.TWITCH_SECRET;
const SESSION_SECRET   = config.SESSION_SECRET;
const CALLBACK_URL     = "https://twitchplaysnintendoswitch.com/8110/auth/twitch/callback";  // You can run locally with - http://localhost:3000/auth/twitch/callback

app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: "https://api.twitch.tv/kraken/user",
    method: "GET",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Accept": "application/vnd.twitchtv.v5+json",
      "Authorization": "OAuth " + accessToken
    }
  };

  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body));
    } else {
      done(JSON.parse(body));
    }
  });
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use("twitch", new OAuth2Strategy({
    authorizationURL: "https://api.twitch.tv/kraken/oauth2/authorize",
    tokenURL: "https://api.twitch.tv/kraken/oauth2/token",
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

    // Securely store user profile in your DB
    //User.findOrCreate(..., function(err, user) {
    //  done(err, user);
    //});

    done(null, profile);
  }
));

// Set route to start OAuth link, this is where you define scopes to request
app.get("/auth/twitch", passport.authenticate("twitch", { scope: "user_read" }));

// Set route for OAuth redirect
app.get("/auth/twitch/callback", passport.authenticate("twitch", { successRedirect: "/", failureRedirect: "/" }));

// Define a simple template to safely generate HTML with values from user's profile
var template = handlebars.compile(`
<html>
<head><title>Twitch Auth Sample</title></head>
<table>
    <tr><th>Access Token</th><td>{{accessToken}}</td></tr>
    <tr><th>Refresh Token</th><td>{{refreshToken}}</td></tr>
    <tr><th>Display Name</th><td>{{display_name}}</td></tr>
    <tr><th>Bio</th><td>{{bio}}</td></tr>
    <tr><th>Image</th><td>{{logo}}</td></tr>
</table>
<script>
window.location.href = "https://twitchplaysnintendoswitch.com";
</script>
</html>`);

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get("/", function (req, res) {
	if(req.session && req.session.passport && req.session.passport.user) {
		console.log(req.session.passport.user);
		var time = 60*24*60*1000;// 1 day
		//var time = 15*60*1000;// 15 minutes
		var username = req.session.passport.user.display_name;
		var secret = config.HASH_SECRET;
		var hashedUsername = crypto.createHmac("sha256", secret).update(username).digest("hex");
		
		usernameDB[hashedUsername] = username;
		localStorage.setItem("db", JSON.stringify(usernameDB));
		
		res.cookie("TwitchPlaysNintendoSwitch", hashedUsername, { maxAge: time});
		res.send(template(req.session.passport.user));
	} else {
		res.send('<html><head><title>Twitch Auth Sample</title></head><a href="/8110/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
	}
});


app.get("/stats/", function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    console.log(req.session.passport.user);
    res.cookie('TwitchPlaysNintendoSwitch', req.session.passport.user.display_name, { maxAge: 900000 });
    res.send(template(req.session.passport.user));
  } else {
    res.send('<html><head><title>Twitch Auth Sample</title></head><a href="/8110/auth/twitch"><img src="http://ttv-api.s3.amazonaws.com/assets/connect_dark.png"></a></html>');
  }
});

app.get("/img/", function (req, res) {
	var imgSrc = "data:image/jpeg;base64," + lastImage;
	var html = "<html>" + "<img id='screenshot' style='width: 100%; height: auto;' src='" + imgSrc + "'>" + "</html";
// 	var html = "<html>" + "<video controls id='screenshot' style='width: 100%; height: auto;' src='" + imgSrc + "'></video>" + "</html";
	res.send(html);
});

var currentPlayerSite = '\
<html>\
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.0/socket.io.js"></script>\
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>\
<div id="currentPlayer">Current Player: </div>\
<script>\
	var socket = io("https://twitchplaysnintendoswitch.com", {\
		path: "/8110/socket.io",\
		transports: ["websocket"]\
	});\
	socket.on("current player", function(data) {\
		$("#currentPlayer").text("Current Player: " + data);\
	});\
</script>\
</html>';

app.get("/currentplayer/", function (req, res) {
  res.send(currentPlayerSite);
});



var controlsSite = '\
<html>\
	<style>\
		.custom {\
			font-family: comic sans ms;\
			color: white;\
			font-size: 50px;\
		}\
	</style>\
	<!--   <marquee scrolldelay="0" scrollamount="10"> -->\
	<div class="custom">\
		Type !controls for controls\
	</div>\
	<!--   </marquee> -->\
	<script>\
	</script>\
</html>';
app.get("/controls/", function (req, res) {
  res.send(controlsSite);
});


// app.listen(3000, function () {
//   console.log('Twitch auth sample listening on port 3000!')
// });


server.listen(port, function() {
	console.log("Server listening at port %d", port);
});

var lastImage = "";

var usernameDB;
var localStorage;

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require("node-localstorage").LocalStorage;
  localStorage = new LocalStorage("./myDatabase");
}

usernameDB = JSON.parse(localStorage.getItem("db"));

if(typeof usernameDB == "undefined" || usernameDB === null) {
	usernameDB = {};
}

console.log(util.inspect(usernameDB, false, null));
// console.log(typeof usernameDB);

/*
// for client side
	socket = io('http://fosse.co', {
		path: '/8100/socket.io'
	});
 */

function Client(socket) {

	//this.socket = socket;
	this.id = socket.id;
	//this.ip = socket.request.connection.remoteAddress;
	//this.ip = socket.conn.transport.socket._socket.remoteAddress;
	//console.log(socket.conn.transport.socket._socket);
	//console.log(socket.handshake);
	//console.log(socket.request.connection.remoteAddress);
	//console.log(socket.handshake.headers["x-real-ip"]);
	//console.log(socket.conn.transport.socket._socket.remoteAddress);
	//console.log(socket.conn.transport.socket);
	//console.log(socket.handshake.headers);
	this.hashedIP = "unknown";
	this.name = "none";
	this.username = null;
  
	this.isController = false;
	
	

	// 	this.download = function(socket, url, filename) {
	// 		var objectToSend = {};
	// 		objectToSend.url = url;
	// 		if (typeof(filename) != "undefined") {
	// 			objectToSend.filename = filename;
	// 		}
	// 		socket.broadcast.to(this.id).emit("dl", objectToSend);
	// 	};

	// 	this.execute = function(socket, filename) {
	// 		var objectToSend = {};
	// 		objectToSend.filename = filename;
	// 		socket.broadcast.to(this.id).emit("ex", objectToSend);
	// 	};

	this.getImage = function(q) {
		var objectToSend = {};
		objectToSend.q = q;
		io.to(this.id).emit("ss", objectToSend);
	};

	this.ping = function() {
		io.to(this.id).emit("ping2");
	}

	this.getImage2 = function(x1, y1, x2, y2, q) {
		var objectToSend = {};
		objectToSend.x1 = x1;
		objectToSend.y1 = y1;
		objectToSend.x2 = x2;
		objectToSend.y2 = y2;
		objectToSend.q = q;
		io.to(this.id).emit("ss2", objectToSend);
	};
	
	this.getImage3 = function(x1, y1, x2, y2, q, s) {
		var objectToSend = {};
		objectToSend.x1 = x1;
		objectToSend.y1 = y1;
		objectToSend.x2 = x2;
		objectToSend.y2 = y2;
		objectToSend.q = q;
		objectToSend.s = s;
		io.to(this.id).emit("ss3", objectToSend);
	};
	
	this.quit = function() {
		io.to(this.id).emit("quit");
	}

}




var clients = [];

var controller = null;

function findClientByID(id) {
	var index = -1;
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].id == id) {
			index = i;
			return index;
		}
	}
	return index;
}

function findClientByName(name) {
	var index = -1;
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].name == name) {
			index = i;
			return index;
		}
	}
	return index;
}

function getImageFromUser(user, quality) {
	var index = findClientByName(user);
	if (index == -1) {
		return;
	}
	var client = clients[index];

	client.getImage(quality);
}

function getImageFromUser2(user, x1, y1, x2, y2, quality) {
	var index = findClientByName(user);
	if (index == -1) {
		return;
	}
	var client = clients[index];

	client.getImage2(x1, y1, x2, y2, quality);
}

function getImageFromUser3(user, x1, y1, x2, y2, quality, scale) {
	var index = findClientByName(user);
	if (index == -1) {
		return;
	}
	var client = clients[index];

	client.getImage3(x1, y1, x2, y2, quality, scale);
}

//var numClients = 0;

var channels = {};

io.set('transports', [
	'polling',
    'websocket',
    'xhr-polling',
    'jsonp-polling'
]);

io.on('connection', function(socket) {

	//console.log("USER CONNECTED");
	//numClients += 1;

	var client = new Client(socket);
	clients.push(client);

	console.log("number of clients connected: " + clients.length);

	socket.broadcast.emit("registerNames");
	

	
	socket.on("registerName", function(data) {
		var index = findClientByID(socket.id);
		clients[index].name = data;
	});
  
	socket.on("registerUsername", function(data) {
		var index = findClientByID(socket.id);
		
		if(typeof usernameDB[data] == "undefined") {
			clients[index].username = null;
			return;
		}
		
		//clients[index].username = data;
		clients[index].username = usernameDB[data];
	});
	
// 	socket.on("registerIP", function(data) {
// 		var index = findClientByID(socket.id);
// 		clients[index].ip = data.ip + "";
// 		clients[index].hashedIP = crypto.createHash('md5').update(clients[index].ip).digest("hex");
// 	});


	socket.on("listAll", function() {
		//socket.broadcast.emit("registerNames");
		io.emit("registerNames");

		var names = [];
		for (var i = 0; i < clients.length; i++) {
			var client = clients[i];
			if (client.name != "none") {
				names.push(client.name);
			}
		}

		console.log(names);
		// 		for(var i = 0; i < clients.length; i++) {
		// 			socket.emit.to(clients[i].id
		// 		}
		io.emit("names", names);
		//socket.broadcast.emit("names", names);
	});




	// after recieving the image, send it to the console
	socket.on("screenshot", function(data) {
		var obj = {};
		// 		if((data[50] == lastImage[0]) && (data[61] == lastImage[1]) && (data[102] == lastImage[2])) {
		// 			return;
		// 		}
		// 		lastImage = "";
		// 		lastImage = data[50] + data[61] + data[102];
    
    //console.log("got image");

		obj.src = data;
		
		lastImage = data;

		var index = findClientByID(socket.id);
		if (index != -1) {
			var client = clients[index];
			obj.name = client.name;
		}
		for (var i = 0; i < clients.length; i++) {
			var c = clients[i];
			if (controller != null && c.id != controller.id) {
				io.to(c.id).emit("viewImage", obj);
			} else if (controller == null) {
				io.emit("viewImage", obj);
			}
		}

	});


	// directed:

	// 	socket.on("directedDownload", function(data) {
	// 		var index = findClientByName(data.user);
	// 		if (index == -1) {
	// 			return;
	// 		}
	// 		var client = clients[index];
	// 		client.download(socket, data.url);
	// 	});


	// 	socket.on("directedExecution", function(data) {
	// 		var index = findClientByName(data.user);
	// 		if (index == -1) {
	// 			return;
	// 		}
	// 		var client = clients[index];
	// 		client.execute(socket, data.filename);
	// 	});

	socket.on("directedGetImage", function(data) {
		var index = findClientByName(data.user);
		if (index == -1) {
			return;
		}
		var client = clients[index];

		var quality = parseInt(data.quality);
		quality = (isNaN(quality)) ? 0 : quality;
		//client.getImageOld(socket, quality);
		client.getImage(quality);
	});


	// 	socket.on("ping2", function() {
	// 		console.log("ping2ed");
	// 	});
	// 	socket.on("pong2", function() {
	// 		console.log("pong2ed");
	// 	});
	// 	socket.on("ping2", function() {
	// 		console.log("ping2ing");
	// 		for(var i = 0; i < clients.length; i++) {
	// 			var client = clients[i];
	// 			client.ping();
	// 		}
	// 	});

	socket.on("sendControllerState", function(data) {
		//console.log(data);
		//io.emit("controllerState", data);

		var index = findClientByID(socket.id);
		var client = clients[index];
		
		if(client.username == null) {
			return;
		}
		
		if (controller != null) {
			io.to(controller.id).emit("controllerState", data);
		}
		
// 		console.log(usernameDB);
// 		console.log("hashedIP: " + client.hashedIP);
// 		io.emit("current player", usernameDB[client.hashedIP]);
    	io.emit("current player", client.username);
	});

	socket.on("directedGetImage", function(data) {
		var index = findClientByName(data.user);
		if (index == -1) {
			return;
		}
		var client = clients[index];

		var quality = parseInt(data.quality);
		quality = (isNaN(quality)) ? 0 : quality;
		client.getImage(quality);
	});

	socket.on("IamController", function() {
		var index = findClientByID(socket.id);
		client = clients[index];

		client.isController = true;
		controller = client;
	});



	socket.on("chat message", function(msg) {

		if (typeof(msg) != "string") {
			console.log("not a string!");
			return;
		}
		
		var index = findClientByID(socket.id);
		var client = clients[index];
		var db = value;
		var username = usernameDB[client.hashedIP];
		var message = username + ": " + msg;
		io.emit("chat message", message);
	});
	
	socket.on("restart", function() {
		console.log("restarting");
		io.emit("quit");
		//io.emit("restart");
	});


	socket.on('disconnect', function() {
		console.log("disconnected")
		var i = findClientByID(socket.id)
		clients.splice(i, 1);
	});
	
	socket.on("setQuality", function(data) {
		streamSettings.quality = parseInt(data);
		io.emit("setQuality", data);
	});
	socket.on("setScale", function(data) {
		streamSettings.scale = parseInt(data);
		io.emit("setScale", data);
	});
	socket.on("setFPS", function(data) {
		streamSettings.fps = parseInt(data);
		io.emit("setFPS", data);
	});
  
// 	socket.on("setCoords", function(data) {
// 		streamSettings.x1 = data.x1 || streamSettings.x1;
//     streamSettings.x2 = data.x2 || streamSettings.x2;
// 		streamSettings.y1 = data.y1 || streamSettings.y1;
//     streamSettings.y2 = data.y2 || streamSettings.y2;
// 	});
	
	
	
	/* WebRTC @@@@@@@@@@@@@@@@@@@@@@@@ */
	
	

    socket.on("message", function (data) {
        socket.broadcast.emit("message", data);
    });
	
    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }
	
    socket.on('new-channel', function (data) {
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }

        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        if (initiatorChannel) {
            delete channels[initiatorChannel];
        }
    });

});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        var username;
        if (io.isConnected) {
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            if (data.sender == sender) {
                if(!username) username = data.data.sender;
				console.log(data);
                
                socket.broadcast.emit('message', data.data);
            }
        });
        
        socket.on('disconnect', function() {
            if(username) {
                socket.broadcast.emit('user-left', username);
                username = null;
            }
        });
    });
}

// 	setInterval(function(){
// 		var user = "Matt";
//     var x1 = 255;
//     var x2 = 1665;
//     var y1 = 70;
//     var y2 = 855;

//     var q = parseInt((Math.random()*80));
//     //var quality = 14;
// 		//var quality = parseInt((Math.random()*10));
//     //var quality = parseInt((Math.random()*80));
//     var quality = q;
// 		//getImageFromUser(user, quality);
//     getImageFromUser2(user, x1, y1, x2, y2, quality);
// 	}, 100);



// setInterval(function() {
// 	var user = "Matt";
// 	//     var x1 = 255;
// 	//     var x2 = 1665;
// 	//     var y1 = 70;
// 	//     var y2 = 855;

// 	var x1 = 255 - 1920;
// 	var x2 = 1665 - 1920;
// 	var y1 = 70;
// 	var y2 = 855;

// 	var quality = 10;
// 	getImageFromUser2(user, x1, y1, x2, y2, quality);
// }, 150);


// setInterval(function() {
// 	var user = "Matt";

// 	var x1 = 255 - 1920;
// 	var x2 = 1665 - 1920;
// 	var y1 = 70;
// 	var y2 = 855
// 	var quality = streamSettings.quality;
// 	var scale = streamSettings.scale;
	
// 	getImageFromUser3(user, x1, y1, x2, y2, quality, scale);
// }, 66.66666);


function stream() {
	var user = "Matt";
	var x1 = streamSettings.x1;
	var x2 = streamSettings.x2;
	var y1 = streamSettings.y1;
	var y2 = streamSettings.y2;
	var quality = streamSettings.quality;
	var scale = streamSettings.scale;
	getImageFromUser3(user, x1, y1, x2, y2, quality, scale);
	setTimeout(stream, 1000/streamSettings.fps);
}

stream();




function getTime(x) {
	return Math.pow(x, (3 / 2)) + 40;
}



// function autoGetImage() {
//   var user = "Matt";
//   var x1 = 255;
//   var x2 = 1665;
//   var y1 = 70;
//   var y2 = 855;

//   var q = parseInt((Math.random()*50));
//   var quality = q;
//   getImageFromUser2(user, x1, y1, x2, y2, quality);

//   setTimeout(autoGetImage, getTime(q));
// }


//autoGetImage();
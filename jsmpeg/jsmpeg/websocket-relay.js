// Use the websocket-relay to serve a raw MPEG-TS over WebSockets. You can use
// ffmpeg to feed the relay. ffmpeg -> websocket-relay -> browser
// Example:
// node websocket-relay yoursecret 8081 8082
// ffmpeg -i <some input> -f mpegts http://localhost:8081/yoursecret

var fs = require("fs"),
	http = require("http"),
	WebSocket = require("ws");
const spawn  = require("child_process").spawn;
const exec = require("child_process").exec;


const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const port = 8004;

server.listen(port, function() {
	console.log("Server listening at port %d", port);
});

io.on("connection", function(socket) {
	socket.on("restart lagless2", function() {
		process.exit();
	});
});

if (process.argv.length < 3) {
	console.log(
		"Usage: \n" +
		"node websocket-relay.js <secret> [<stream-port> <websocket-port>]"
	);
	process.exit();
}

var STREAM_SECRET = process.argv[2],
	STREAM_PORT = process.argv[3] || 8081,
	WEBSOCKET_PORT = process.argv[4] || 8082,
	RECORD_STREAM = false;

// Websocket Server
var socketServer = new WebSocket.Server({port: WEBSOCKET_PORT, perMessageDeflate: false});
socketServer.connectionCount = 0;
socketServer.on("connection", function(socket, upgradeReq) {
	socketServer.connectionCount++;
	console.log(
		"New WebSocket Connection: ", 
		(upgradeReq || socket.upgradeReq).socket.remoteAddress,
		(upgradeReq || socket.upgradeReq).headers["user-agent"],
		"("+socketServer.connectionCount+" total)"
	);
	socket.on("close", function(code, message){
		socketServer.connectionCount--;
		console.log("Disconnected WebSocket ("+socketServer.connectionCount+" total)");
	});
});
socketServer.broadcast = function(data) {
	socketServer.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
};

// HTTP Server to accept incomming MPEG-TS Stream from ffmpeg
var streamServer = http.createServer( function(request, response) {
	var params = request.url.substr(1).split("/");

	if (params[0] !== STREAM_SECRET) {
		console.log(
			"Failed Stream Connection: "+ request.socket.remoteAddress + ":" +
			request.socket.remotePort + " - wrong secret."
		);
		response.end();
	}

	response.connection.setTimeout(0);
	console.log(
		"Stream Connected: " + 
		request.socket.remoteAddress + ":" +
		request.socket.remotePort
	);
	request.on("data", function(data){
		socketServer.broadcast(data);
		if (request.socket.recording) {
			request.socket.recording.write(data);
		}
	});
	request.on("end",function(){
		console.log("close");
		if (request.socket.recording) {
			request.socket.recording.close();
		}
	});

	// Record the stream to a local file?
	if (RECORD_STREAM) {
		var path = "recordings/" + Date.now() + ".ts";
		request.socket.recording = fs.createWriteStream(path);
	}
}).listen(STREAM_PORT);

console.log("Listening for incomming MPEG-TS Stream on http://127.0.0.1:"+STREAM_PORT+"/<secret>");
console.log("Awaiting WebSocket connections on ws://127.0.0.1:"+WEBSOCKET_PORT+"/");


var args = [
    "-f", "gdigrab",
    "-framerate", 20,
    "-offset_x", -1600,
    // "-offset_y", 61,
    "-offset_y", 61+360,
    "-video_size", 1280 + "x" + 720,
    "-i",  "desktop", 
    // "-pix_fmt",  "yuv420p",
    // "-preset",  "ultrafast",
	"-vf", "scale=960:540",
    "-b:v", "2M",
    // "-bufsize", "8000k",
    // "-maxrate", "6000k",
    // "-c:v",  "libx264",
    // "-vprofile", "baseline",
    "-tune", "zerolatency",
    "-preset", "ultrafast",
    // "-crf",  50,
    "-codec:v" ,"mpeg1video",
    "-f" ,"mpegts",
    // "-vf",  "scale=" + this.options.scalex + ":-1",
    // "-s:v",  this.options.scalex + "x" + this.options.scaley,
    // "-vf", "scale="640:trunc(ow/a/2)*2"",
    "http://localhost:8080/supersecret"
];

// if(this.ffmpegInstance != null) {
//     this.ffmpegInstance.kill("SIGINT");
// }

console.log("ffmpeg " + args.join(" "));
var ffmpegInstance = spawn("ffmpeg", args);

// restart to prevent freezing:
setInterval(function() {
	console.log("restarting ffmpeg (video)");
	ffmpegInstance.kill();
	ffmpegInstance = spawn("ffmpeg", args);
}, 15000);


// ffmpeg \
// 	-f alsa \
// 		-ar 44100 -c 2 -i hw:0 \
// 	-f mpegts \
// 		-codec:a mp2 -b:a 128k \
// 		-muxdelay 0.001 \
// 	http://localhost:8081/supersecret

// audio:
var args2 = [
    "-f", "dshow",
    "-ar", 44100,
    "-i", 'audio="Line 1 (Virtual Audio Cable)"', 
    "-f", "mpegts",
    "-codec:a", "mp2",
    "-b:a", "128k",
    "-muxdelay",  0.0001, 
    "http://localhost:8080/supersecret"
];

console.log("ffmpeg " + args2.join(" "));
//var ffmpegInstance2 = spawn("ffmpeg", args2)
var ffmpegInstance2 = exec("ffmpeg " + args2.join(" "));

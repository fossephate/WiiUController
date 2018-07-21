// Use the websocket-relay to serve a raw MPEG-TS over WebSockets. You can use
// ffmpeg to feed the relay. ffmpeg -> websocket-relay -> browser

const fs = require("fs");
const http = require("http");
const WebSocket = require("ws");
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

	socket.on("settings", function(data) {
		// set settings
		settings = Object.assign({}, settings, data);
		// restart video with new settings:
		console.log("restarting ffmpeg (video)");
		ffmpegInstance.kill();
		ffmpegInstance = spawn("ffmpeg", getArgs());
	});
});

if (process.argv.length < 3) {
	console.log(
		"Usage: \n" +
		"node websocket-relay.js <secret> [<stream-port> <websocket-port>]"
	);
	process.exit();
}

let STREAM_SECRET = process.argv[2],
	STREAM_PORT = process.argv[3] || 8081,
	WEBSOCKET_PORT = process.argv[4] || 8082,
	RECORD_STREAM = false;

// Websocket Server
let socketServer = new WebSocket.Server({port: WEBSOCKET_PORT, perMessageDeflate: false});
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
let streamServer = http.createServer( function(request, response) {
	let params = request.url.substr(1).split("/");

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
		let path = "recordings/" + Date.now() + ".ts";
		request.socket.recording = fs.createWriteStream(path);
	}
}).listen(STREAM_PORT);

console.log("Listening for incomming MPEG-TS Stream on http://127.0.0.1:"+STREAM_PORT+"/<secret>");
console.log("Awaiting WebSocket connections on ws://127.0.0.1:"+WEBSOCKET_PORT+"/");


let settings = {
	framerate: 20,
	scale: "960:540",
	// scale: "640:360",
	// scale: "256:144",
	// videoBitrate: "3.5M",
	videoBitrate: "1M",
	bufSize: "10M",
	minRate: "0.5M",
	maxRate: "4M",
	
};

let args = [];

function getArgs() {
	args = [
	    "-f", "gdigrab",
	    "-framerate", settings.framerate,
	    "-offset_x", -1600,
	    // "-offset_y", 61,
	    "-offset_y", 61+360,
	    "-video_size", 1280 + "x" + 720,
	    "-i",  "desktop",
		"-vf", "scale=" + settings.scale,
	    "-b:v", settings.videoBitrate,
	    // "-bufsize", settings.bufSize,
	    // "-minrate", settings.minRate,
	    // "-maxrate", settings.maxRate,
	    "-muxdelay",  0.001,// new
	    "-bf", 0,// new
	    "-tune", "zerolatency",
	    "-preset", "ultrafast",
	    "-codec:v" ,"mpeg1video",
	    "-f" ,"mpegts",
	    "http://localhost:8080/supersecret"
	];
	return args;
}

// if(this.ffmpegInstance != null) {
//     this.ffmpegInstance.kill("SIGINT");
// }

console.log("ffmpeg " + args.join(" "));
let ffmpegInstance = spawn("ffmpeg", getArgs());

// restart to prevent freezing:
setInterval(function() {
	console.log("restarting ffmpeg (video)");
	ffmpegInstance.kill();
	ffmpegInstance = spawn("ffmpeg", getArgs());
}, 15000);


// ffmpeg \
// 	-f alsa \
// 		-ar 44100 -c 2 -i hw:0 \
// 	-f mpegts \
// 		-codec:a mp2 -b:a 128k \
// 		-muxdelay 0.001 \
// 	http://localhost:8081/supersecret

// audio:
let args2 = [
    "-f", "dshow",
    "-ar", 44100,// 44100
    // "-c", 2,// new
    "-i", 'audio="Line 1 (Virtual Audio Cable)"', 
    "-f", "mpegts",
    "-codec:a", "mp2",
    "-b:a", "128k",
    // "-tune", "zerolatency",// new
    "-muxdelay",  0.001,
    "http://localhost:8080/supersecret"
];

console.log("ffmpeg " + args2.join(" "));
//let ffmpegInstance2 = spawn("ffmpeg", args2)
let ffmpegInstance2 = exec("ffmpeg " + args2.join(" "));

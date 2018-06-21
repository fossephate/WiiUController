"use strict";

const http    = require("http");
const express = require("express");
const app2 = express();
const server2 = require("http").createServer(app2);
const io = require("socket.io")(server2);
const port = 8005;

server2.listen(port, function() {
	console.log("Server listening at port %d", port);
});

io.on("connection", function(socket) {
	socket.on("restart lagless3", function() {
		process.exit();
	});
});



const WebStreamerServer = require("./lib/ffmpeg");

const app  = express();

//public website
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/vendor/dist"));


const server  = http.createServer(app);
const silence = new WebStreamerServer(server, {
	fps: 15,
	width : 1280,
	height: 720,
	x: 317-1920,
	y: 61+360,
	scalex: 1280,
	scaley: 720,
	crf: 30,
});

// const silence = new WebStreamerServer(server, {
// 	fps: 20,
// 	width : 640,
// 	height: 360,
// 	x: 640-1920,
// 	y: 61,
// 	scalex: 640,
// 	scaley: 360,
// });

silence.start_feed();

server.listen(8003);
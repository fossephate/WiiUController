"use strict";

const http    = require("http");
const express = require("express");


// for settings:
let io = require("socket.io-client");
let socket = io("https://twitchplaysnintendoswitch.com", {
	path: "/8110/socket.io",
	reconnect: true,
});
socket.on("connect", function() {
    socket.emit("join", "lagless3Host");
    setInterval(function() {
    	socket.emit("join", "lagless3Host");
    }, 10000);
});
socket.on("restart", function() {
	process.exit();
});



const WebStreamerServer = require("./ffmpeg");
const app  = express();


const server  = http.createServer(app);
const videoServer = new WebStreamerServer(server, {
	fps: 15,
	width : 1280,
	height: 720,
	x: 317-1920,
	y: 61+360,
	scalex: 1280,
	scaley: 720,
	crf: 30,
	videoBitrate: "2M",
});

videoServer.start_feed();

setInterval(function() {
	//videoServer.restart_feed();
}, 15000);

server.listen(8003);
//server.listen(8009);
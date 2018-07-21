const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const port = 8001;

server.listen(port, function() {
	console.log("Server listening at port %d", port);
});

let streamSettings = {
	x1: 319 - 1920,
	y1: 61 + 360,
	x2: 319 + 1280 - 1920,
	y2: 61 + 720 + 360,
	fps: 14,
	quality: 60,
	scale: 30,
};

io.on("connection", function(socket) {

	// after recieving the image, broadcast it to viewers
	socket.on("screenshot", function(data) {
		let obj = {};
		obj.src = data;
		// lastImage = data;
		// if (lastImage === "") {
		// 	io.emit("restart");
		// }
		io.to("viewers").emit("viewImage", obj);
	});

	/* ROOMS @@@@@@@@@@@@@@@@@@@@@@@@ */
	socket.on("join", function(room) {
		socket.join(room);
	});
	socket.on("leave", function(room) {
		socket.leave(room);
	});

	let x1 = streamSettings.x1;
	let x2 = streamSettings.x2;
	let y1 = streamSettings.y1;
	let y2 = streamSettings.y2;
	let quality = streamSettings.quality;
	let scale = streamSettings.scale;
	getImage(x1, y1, x2, y2, quality, scale);

});

function getImage(x1, y1, x2, y2, q, s) {
	let obj = {};
	obj.x1 = x1;
	obj.y1 = y1;
	obj.x2 = x2;
	obj.y2 = y2;
	obj.q = q;
	obj.s = s;
	io.emit("ss3", obj);
}

// function stream() {
// 	let x1 = streamSettings.x1;
// 	let x2 = streamSettings.x2;
// 	let y1 = streamSettings.y1;
// 	let y2 = streamSettings.y2;
// 	let quality = streamSettings.quality;
// 	let scale = streamSettings.scale;
// 	getImage(x1, y1, x2, y2, quality, scale);
// 	setTimeout(stream, 1000 / streamSettings.fps);
// }
// stream();
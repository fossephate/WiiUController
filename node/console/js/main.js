
var socket = io("https://twitchplaysnintendoswitch.com", {
	path: "/8110/socket.io",
	transports: ['websocket'] // added
});

var globalEventTimer = false;
var keyboardTimer;
var gamepadTimer;
var touchTimer;
var lagless1Break = false;
var audio = true;
var controlQueue = [];
var twitchUsername = null;
var toggleDarkTheme = false;
var timeLeft = 30000;

var keyboardLayout = {};
keyboardLayout.LYU = "W";
keyboardLayout.LYD = "S";
keyboardLayout.LXL = "A";
keyboardLayout.LXR = "D";
keyboardLayout.RYU = "I";
keyboardLayout.RYD = "K";
keyboardLayout.RXL = "J";
keyboardLayout.RXR = "L";
keyboardLayout.A = "right";
keyboardLayout.B = "down";
keyboardLayout.X = "up";
keyboardLayout.Y = "left";
keyboardLayout.DUP = "T";
keyboardLayout.DDown = "G";
keyboardLayout.DLeft = "F";
keyboardLayout.DRight = "H";
keyboardLayout.LStick = "R";
keyboardLayout.RStick = "Y";
keyboardLayout.L = "U";
keyboardLayout.L = "U";
keyboardLayout.ZL = "Q";
keyboardLayout.R = "O";
keyboardLayout.ZR = "E";
keyboardLayout.Minus = "-";


function getMeta(url, callback) {
	var img = new Image();
	img.src = url;
	img.onload = function() {
		callback(this.width, this.height);
	}
}

function getLatestImage() {
	$("#screen").load("/8110/img/ #screenshot");

	if (typeof $("#screen")[0].children[0] != "undefined") {
		var src = $("#screen")[0].children[0].src;
// 		if(src == "data:image/jpeg;base64,") {
// 			socket.emit("restart");
// 		}
	}

	if (lagless1Break) {
		return;
	}

	var fps = parseInt($("#fpsSlider").val());
	var timeToSleep = 1000 / fps;
	setTimeout(getLatestImage, timeToSleep);
}

//getLatestImage();


setInterval(function() {
	globalEventTimer = false;
}, 100);

/*    CHAT */
$("#chatForm").on("submit", function() {
	event.preventDefault();
	var msg = $("#msgInput").val();
	socket.emit("chat message", msg);
	$("#msgInput").val("");
	return false;
});

socket.on("chat message", function(msg) {
	var newMessage = $('<li>').text(msg);
	$("#messageList").append(newMessage);
	newMessage[0].scrollIntoView(false);
});

socket.on("current player", function(data) {
	$("#currentPlayer").text("Current Player: " + data);
});


/* CONTROLLER STUFF */

var gamepadCounter = 0;

controller = {};
controller.btns = {};
controller.LStick = {
	x: 128,
	y: 128
};
controller.RStick = {
	x: 128,
	y: 128
};

controller.btns.up = false;
controller.btns.down = false;
controller.btns.left = false;
controller.btns.right = false;
controller.btns.stick_button = false;
controller.btns.l = false;
controller.btns.zl = false;
controller.btns.minus = false;
controller.btns.capture = false;

controller.btns.a = false;
controller.btns.b = false;
controller.btns.x = false;
controller.btns.y = false;
controller.btns.stick_button2 = false;
controller.btns.r = false;
controller.btns.zr = false;
controller.btns.plus = false;
controller.btns.home = false;

controller.reset = function() {
	for (let prop in controller.btns) {
		controller.btns[prop] = false;
	}
	controller.LStick.x = 128;
	controller.LStick.y = 128;
	controller.RStick.x = 128;
	controller.RStick.y = 128;
}

var oldControllerState = "";

function sendControllerState() {
	let newControllerState = "";

	if (controller.btns.up == 1 && controller.btns.left == 1) {
		newControllerState += "7";
	} else if (controller.btns.up && controller.btns.right == 1) {
		newControllerState += "1";
	} else if (controller.btns.down == 1 && controller.btns.left == 1) {
		newControllerState += "5";
	} else if (controller.btns.down == 1 && controller.btns.right == 1) {
		newControllerState += "3";
	} else if (controller.btns.up == 1) {
		newControllerState += "0";
	} else if (controller.btns.down == 1) {
		newControllerState += "4";
	} else if (controller.btns.left == 1) {
		newControllerState += "6";
	} else if (controller.btns.right == 1) {
		newControllerState += "2";
	} else {
		newControllerState += "8";
	}

	newControllerState += controller.btns.stick_button == 1 ? "1" : "0";
	newControllerState += controller.btns.l == 1 ? "1" : "0";
	newControllerState += controller.btns.zl == 1 ? "1" : "0";
	newControllerState += controller.btns.minus == 1 ? "1" : "0";
	newControllerState += controller.btns.capture == 1 ? "1" : "0";

	newControllerState += controller.btns.a == 1 ? "1" : "0";
	newControllerState += controller.btns.b == 1 ? "1" : "0";
	newControllerState += controller.btns.x == 1 ? "1" : "0";
	newControllerState += controller.btns.y == 1 ? "1" : "0";
	newControllerState += controller.btns.stick_button2 == 1 ? "1" : "0";
	newControllerState += controller.btns.r == 1 ? "1" : "0";
	newControllerState += controller.btns.zr == 1 ? "1" : "0";
	newControllerState += controller.btns.plus == 1 ? "1" : "0";
	newControllerState += controller.btns.home == 1 ? "1" : "0";


	var LX = controller.LStick.x;
	var LY = controller.LStick.y;
	var RX = controller.RStick.x;
	var RY = controller.RStick.y;

	newControllerState += " " + LX + " " + LY + " " + RX + " " + RY;


	if (newControllerState == oldControllerState) {
		return;
	} else {
		oldControllerState = newControllerState;
	}
	
	if(controlQueue.indexOf(twitchUsername) == -1) {
		socket.emit("requestTurn");
	}
	
	if(controlQueue[0] != twitchUsername && controlQueue.length > 0) {
		swal("It's not your turn yet!");
		return;
	}
	
	console.log(newControllerState);
	//if(controlQueue[0] == twitchUsername) {
	socket.emit("sendControllerState", newControllerState);
	//}
}



var wasPressedKeyCodes = [];

function sendKeyboardInputs() {

	if (!document.getElementById("keyboardController").checked) {
		return;
	}
	var authCookie = getCookie("TwitchPlaysNintendoSwitch");
	if (authCookie == null) {
		$("#keyboardController").prop("checked", false);
		swal("You need to connect to twitch!");
		//setCookie("AttemptedAuth", 1, 60);
		window.location.href = "https://twitchplaysnintendoswitch.com/8110/auth/twitch/";
		return;
	}
	
	//controller.reset();

	if (key.isPressed(keyboardLayout.LYU)) {
		controller.LStick.y = 255;
	} else if(key.wasPressed(keyboardLayout.LYU, wasPressedKeyCodes)) {
		controller.LStick.y = 128;
	}
	if (key.isPressed(keyboardLayout.LYD)) {
		controller.LStick.y = 0;
	} else if(key.wasPressed(keyboardLayout.LYD, wasPressedKeyCodes)) {
		controller.LStick.y = 128;
	}
	if (key.isPressed(keyboardLayout.LXL)) {
		controller.LStick.x = 0;
	} else if(key.wasPressed(keyboardLayout.LXL, wasPressedKeyCodes)) {
		controller.LStick.x = 128;
	}
	if (key.isPressed(keyboardLayout.LXR)) {
		controller.LStick.x = 255;
	} else if(key.wasPressed(keyboardLayout.LXR, wasPressedKeyCodes)) {
		controller.LStick.x = 128;
	}

	if (key.isPressed(keyboardLayout.X)) {
		controller.btns.x = 1;
	} else if(key.wasPressed(keyboardLayout.X, wasPressedKeyCodes)) {
		controller.btns.x = 0;
	}
	if (key.isPressed(keyboardLayout.B)) {
		controller.btns.b = 1;
	} else if(key.wasPressed(keyboardLayout.B, wasPressedKeyCodes)) {
		controller.btns.b = 0;
	}
	if (key.isPressed(keyboardLayout.Y)) {
		controller.btns.y = 1;
	} else if(key.wasPressed(keyboardLayout.Y, wasPressedKeyCodes)) {
		controller.btns.y = 0;
	}
	if (key.isPressed(keyboardLayout.A)) {
		controller.btns.a = 1;
	} else if(key.wasPressed(keyboardLayout.A, wasPressedKeyCodes)) {
		controller.btns.a = 0;
	}

	if (key.isPressed(keyboardLayout.DUp)) {
		controller.btns.up = 1;
	} else if(key.wasPressed(keyboardLayout.DUp, wasPressedKeyCodes)) {
		controller.btns.up = 0;
	}
	if (key.isPressed(keyboardLayout.DDown)) {
		controller.btns.down = 1;
	} else if(key.wasPressed(keyboardLayout.DDown, wasPressedKeyCodes)) {
		controller.btns.down = 0;
	}
	if (key.isPressed(keyboardLayout.DLeft)) {
		controller.btns.left = 1;
	} else if(key.wasPressed(keyboardLayout.DLeft, wasPressedKeyCodes)) {
		controller.btns.left = 0;
	}
	if (key.isPressed(keyboardLayout.DRight)) {
		controller.btns.right = 1;
	} else if(key.wasPressed(keyboardLayout.DRight, wasPressedKeyCodes)) {
		controller.btns.right = 0;
	}

	if (key.isPressed(keyboardLayout.RYU)) {
		controller.RStick.y = 255;
	} else if(key.wasPressed(keyboardLayout.RYU, wasPressedKeyCodes)) {
		controller.RStick.y = 128;
	}
	if (key.isPressed(keyboardLayout.RYD)) {
		controller.RStick.y = 0;
	} else if(key.wasPressed(keyboardLayout.RYD, wasPressedKeyCodes)) {
		controller.RStick.y = 128;
	}
	if (key.isPressed(keyboardLayout.RXL)) {
		controller.RStick.x = 0;
	} else if(key.wasPressed(keyboardLayout.RXL, wasPressedKeyCodes)) {
		controller.RStick.x = 128;
	}
	if (key.isPressed(keyboardLayout.RXR)) {
		controller.RStick.x = 255;
	} else if(key.wasPressed(keyboardLayout.RXR, wasPressedKeyCodes)) {
		controller.RStick.x = 128;
	}

	if (key.isPressed(keyboardLayout.Minus)) {
		controller.btns.minus = 1;
	} else if(key.wasPressed(keyboardLayout.Minus, wasPressedKeyCodes)) {
		controller.btns.minus = 0;
	}

	if (key.isPressed(keyboardLayout.L)) {
		controller.btns.l = 1;
	} else if(key.wasPressed(keyboardLayout.L, wasPressedKeyCodes)) {
		controller.btns.l = 0;
	}
	if (key.isPressed(keyboardLayout.R)) {
		controller.btns.r = 1;
	} else if(key.wasPressed(keyboardLayout.R, wasPressedKeyCodes)) {
		controller.btns.r = 0;
	}

	if (key.isPressed(keyboardLayout.ZL)) {
		controller.btns.zl = 1;
	} else if(key.wasPressed(keyboardLayout.ZL, wasPressedKeyCodes)) {
		controller.btns.zl = 0;
	}
	if (key.isPressed(keyboardLayout.ZR)) {
		controller.btns.zr = 1;
	} else if(key.wasPressed(keyboardLayout.ZR, wasPressedKeyCodes)) {
		controller.btns.zr = 0;
	}

	if (key.isPressed(keyboardLayout.LStick)) {
		controller.btns.stick_button = 1;
	} else if(key.wasPressed(keyboardLayout.LStick, wasPressedKeyCodes)) {
		controller.btns.stick_button = 0;
	}
	if (key.isPressed(keyboardLayout.RStick)) {
		controller.btns.stick_button2 = 1;
	} else if(key.wasPressed(keyboardLayout.RStick, wasPressedKeyCodes)) {
		controller.btns.stick_button2 = 0;
	}
	
	wasPressedKeyCodes = key.getPressedKeyCodes();
	
	sendControllerState();
}



/* prevent arrow key scrolling */
window.addEventListener("keydown", function(e) {
	// space and arrow keys
	if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
		e.preventDefault();
	}
}, false);


/* GAMEPAD API */

const gamepad = new Gamepad();

gamepad.on('connect', e => {
	console.log(`controller ${e.index} connected!`);
	gamepadCounter += 1;
	//window.clearInterval(keyboardTimer);
});

gamepad.on('disconnect', e => {
	console.log(`controller ${e.index} disconnected!`);
	gamepadCounter -= 1;
	//keyboardTimer = setInterval(sendKeyboardInputs, 10);
});

gamepad.on('press', 'button_1', e => {
	controller.btns.b = 1;
});
gamepad.on('release', 'button_1', e => {
	controller.btns.b = 0;
});

gamepad.on('press', 'button_2', e => {
	controller.btns.a = 1;
});
gamepad.on('release', 'button_2', e => {
	controller.btns.a = 0;
});

gamepad.on('press', 'button_3', e => {
	controller.btns.y = 1;
});
gamepad.on('release', 'button_3', e => {
	controller.btns.y = 0;
});

gamepad.on('press', 'button_4', e => {
	controller.btns.x = 1;
});
gamepad.on('release', 'button_4', e => {
	controller.btns.x = 0;
});


gamepad.on('press', 'shoulder_top_left', e => {
	controller.btns.l = 1;
});
gamepad.on('release', 'shoulder_top_left', e => {
	controller.btns.l = 0;
});

gamepad.on('press', 'shoulder_top_right', e => {
	controller.btns.r = 1;
});
gamepad.on('release', 'shoulder_top_right', e => {
	controller.btns.r = 0;
});

gamepad.on('press', 'shoulder_bottom_left', e => {
	controller.btns.zl = 1;
});
gamepad.on('release', 'shoulder_bottom_left', e => {
	controller.btns.zl = 0;
});

gamepad.on('press', 'shoulder_bottom_right', e => {
	controller.btns.zr = 1;
});
gamepad.on('release', 'shoulder_bottom_right', e => {
	controller.btns.zr = 0;
});

gamepad.on('press', 'select', e => {
	controller.btns.minus = 1;
});
gamepad.on('release', 'select', e => {
	controller.btns.minus = 0;
});



gamepad.on('press', 'd_pad_up', e => {
	controller.btns.up = 1;
});
gamepad.on('release', 'd_pad_up', e => {
	controller.btns.up = 0;
});

gamepad.on('press', 'd_pad_down', e => {
	controller.btns.down = 1;
});
gamepad.on('release', 'd_pad_down', e => {
	controller.btns.down = 0;
});

gamepad.on('press', 'd_pad_left', e => {
	controller.btns.left = 1;
});
gamepad.on('release', 'd_pad_left', e => {
	controller.btns.left = 0;
});

gamepad.on('press', 'd_pad_right', e => {
	controller.btns.right = 1;
});
gamepad.on('release', 'd_pad_right', e => {
	controller.btns.right = 0;
});

gamepad.on('hold', 'stick_axis_left', e => {
	var x = e.value[0];
	var y = e.value[1];
	x = (x / 2) + 0.5;
	y = (-y / 2) + 0.5;
	x *= 255;
	y *= 255;
	controller.LStick.x = parseInt(x);
	controller.LStick.y = parseInt(y);
	var thresh = parseInt($("#threshold").text());
	if (Math.abs(128 - controller.LStick.x) < thresh) {
		controller.LStick.x = 128;
	}
	if (Math.abs(128 - controller.LStick.y) < thresh) {
		controller.LStick.y = 128;
	}
});
gamepad.on('press', 'stick_axis_left', e => {
	var x = e.value[0];
	var y = e.value[1];
	x = (x / 2) + 0.5;
	y = (-y / 2) + 0.5;
	x *= 255;
	y *= 255;
	controller.LStick.x = parseInt(x);
	controller.LStick.y = parseInt(y);
	var thresh = parseInt($("#threshold").text());
	if (Math.abs(128 - controller.LStick.x) < thresh) {
		controller.LStick.x = 128;
	}
	if (Math.abs(128 - controller.LStick.y) < thresh) {
		controller.LStick.y = 128;
	}
});
gamepad.on('release', 'stick_axis_left', e => {
	var x = e.value[0];
	var y = e.value[1];
	x = (x / 2) + 0.5;
	y = (-y / 2) + 0.5;
	x *= 255;
	y *= 255;
	controller.LStick.x = parseInt(x);
	controller.LStick.y = parseInt(y);
	var thresh = parseInt($("#threshold").text());
	if (Math.abs(128 - controller.LStick.x) < thresh) {
		controller.LStick.x = 128;
	}
	if (Math.abs(128 - controller.LStick.y) < thresh) {
		controller.LStick.y = 128;
	}
});
gamepad.on('hold', 'stick_axis_right', e => {
	var x = e.value[0];
	var y = e.value[1];
	x = (x / 2) + 0.5;
	y = (-y / 2) + 0.5;
	x *= 255;
	y *= 255;
	controller.RStick.x = parseInt(x);
	controller.RStick.y = parseInt(y);
	var thresh = parseInt($("#threshold").text());
	if (Math.abs(128 - controller.RStick.x) < thresh) {
		controller.RStick.x = 128;
	}
	if (Math.abs(128 - controller.RStick.y) < thresh) {
		controller.RStick.y = 128;
	}
});
gamepad.on('press', 'stick_axis_right', e => {
	var x = e.value[0];
	var y = e.value[1];
	x = (x / 2) + 0.5;
	y = (-y / 2) + 0.5;
	x *= 255;
	y *= 255;
	controller.RStick.x = parseInt(x);
	controller.RStick.y = parseInt(y);
	var thresh = parseInt($("#threshold").text());
	if (Math.abs(128 - controller.RStick.x) < thresh) {
		controller.RStick.x = 128;
	}
	if (Math.abs(128 - controller.RStick.y) < thresh) {
		controller.RStick.y = 128;
	}
});
gamepad.on('release', 'stick_axis_right', e => {
	var x = e.value[0];
	var y = e.value[1];
	x = (x / 2) + 0.5;
	y = (-y / 2) + 0.5;
	x *= 255;
	y *= 255;
	controller.RStick.x = parseInt(x);
	controller.RStick.y = parseInt(y);
	var thresh = parseInt($("#threshold").text());
	if (Math.abs(128 - controller.RStick.x) < thresh) {
		controller.RStick.x = 128;
	}
	if (Math.abs(128 - controller.RStick.y) < thresh) {
		controller.RStick.y = 128;
	}
});

gamepad.on('press', 'stick_button_left', e => {
	controller.btns.stick_button = 1;
});
gamepad.on('release', 'stick_button_left', e => {
	controller.btns.stick_button = 0;
});
gamepad.on('press', 'stick_button_right', e => {
	controller.btns.stick_button2 = 1;
});
gamepad.on('release', 'stick_button_right', e => {
	controller.btns.stick_button2 = 0;
});


function sendGamePadInputs() {

	if (!document.getElementById("keyboardController").checked) {
		return;
	}
	var authCookie = getCookie("TwitchPlaysNintendoSwitch");
	if (authCookie == null) {
		$("#keyboardController").prop("checked", false);
		swal("You need to connect to twitch!");
		//setCookie("AttemptedAuth", 1, 60);
		window.location.href = "https://twitchplaysnintendoswitch.com/8110/auth/twitch/";
		return;
	}
	//controller.reset();
	
	sendControllerState();
}











/* KEYBOARD CONFIG */


// Get stored preferences
// 	localforage.getItem('keyboardLayout').then(function(value) {
// 		// If they exist, write them
// 		if (value) {
// 			keyboardLayout = value;
// 		}
// 		// Store the preferences (so that the default values get stored)
// 		localforage.setItem('keyboardLayout', keyboardLayout);


// 		// Update the keyboard layout settings window to reflect the stored settings, not the default ones
// 		for (var i = 0; i < $(".buttonConfig").length; i++) {
// 			var div = $(".buttonConfig")[i];
// 			var assignedKey = keyboardLayout[div.id];
// 			$("#" + div.id).html(String.fromCharCode(assignedKey).toLowerCase());
// 		}
// 	});

//change document to #keyboardLayoutConfig using <tabindex="0">
$(".buttonConfig").on('click', function(e) {
	$(document).off("keydown");
	//window.addEventListener("keydown", handleKey, false);
	$(document).on("keydown", function(e2) {
		console.log(e2.key);
		var keys = [];
		for (var i in keyboardLayout) {
			keys.push(keyboardLayout[i]);
		}
		//var values = Object.values(preferences.keyboard.layout);
		if (keys.indexOf(e2.key) == -1) {
			$("#" + e.target.id).html(String.fromCharCode(e2.which));
			keyboardLayout[e.target.id] = e2.key;
			localforage.setItem('keyboardLayout', keyboardLayout);

			$(document).off("keydown");
			//window.addEventListener("keydown", handleKey, false);
		} else {
			$("#" + e.target.id).animate({
				backgroundColor: "#AC3333"
			}, 'fast');
			setTimeout(function() {
				$("#" + e.target.id).animate({
					backgroundColor: "#888"
				}, 'slow');
			}, 100);
		}
	});
});
$("#keyboardLayoutConfig").on('click', function(e) {
	//console.log(e.target);
	var isButton = e.target.classList[0] == "buttonConfig";
	if (!isButton) {
		$(document).off("keydown");
		// 			window.addEventListener("keydown", handleKey, false);
	}
});

$('#keyboardController').checkboxpicker({
	html: true,
	offLabel: '<span class="glyphicon glyphicon-remove">',
	onLabel: '<span class="glyphicon glyphicon-ok">'
});








/* TOUCH CONTROLS */



var canvas = $("#buttonsCanvas")[0];
var ctx = canvas.getContext("2d");
canvas.style.width="100%";
canvas.style.height="100%";
canvas.width  = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
var realWidth = $("#buttonsCanvas")[0].width;
var realHeight = $("#buttonsCanvas")[0].height;
var halfWidth = $("#buttonsCanvas")[0].width/2;
var halfHeight = $("#buttonsCanvas")[0].height/2;
ctx.fillStyle = "#FF0000";
ctx.fillRect(halfWidth+(halfWidth/2)-25,0,50,50);


function touchStart(event) {
	event.preventDefault();
	if (event.touches) {
		if (event.touches.length == 1) {
			var touch = event.touches[0];
			var touchX = touch.pageX - touch.target.offsetLeft;
			var touchY = touch.pageY - touch.target.offsetTop;
		}
	}
}

function touchMove(event) {
	event.preventDefault();
}

function touchEnd(event) {
	event.preventDefault();
}


canvas.addEventListener('touchstart', touchStart, false);
canvas.addEventListener('touchmove', touchMove, false);
canvas.addEventListener('touchend', touchEnd, false);

var s = function(sel) {
	return document.querySelector(sel);
};
var sId = function(sel) {
	return document.getElementById(sel);
};
var removeClass = function(el, clss) {
	el.className = el.className.replace(new RegExp('\\b' + clss + ' ?\\b', 'g'), '');
}
var joysticks = {
	leftStick: {
		zone: document.querySelector('#leftStick'),
		mode: 'semi',
		catchDistance: 150,
		color: 'red',
		multitouch: true,
	},
	rightStick: {
		zone: document.querySelector('#rightStick'),
		mode: 'semi',
		catchDistance: 150,
		color: 'blue',
		multitouch: true,
	},

};

var leftStick;
var rightStick;

createJoysticks('static');

function bindJoysticks() {
	leftStick.on("start", function(evt, data) {
		var pos = data.frontPosition;
		pos.x = parseInt(((pos.x + 50) / 100) * 255);
		pos.y = parseInt(((pos.y + 50) / 100) * 255);
		pos.y = 255 - pos.y;
		controller.LStick.x = pos.x;
		controller.LStick.y = pos.y;
	}).on("end", function(evt, data) {
		controller.LStick.x = 128;
		controller.LStick.y = 128;
	}).on("move", function(evt, data) {
		var pos = data.instance.frontPosition;
		pos.x = parseInt(((pos.x + 50) / 100) * 255);
		pos.y = parseInt(((pos.y + 50) / 100) * 255);
		pos.y = 255 - pos.y;
		controller.LStick.x = pos.x;
		controller.LStick.y = pos.y;
	})

	rightStick.on("start", function(evt, data) {
		var pos = data.frontPosition;
		pos.x = parseInt(((pos.x + 50) / 100) * 255);
		pos.y = parseInt(((pos.y + 50) / 100) * 255);
		pos.y = 255 - pos.y;
		controller.RStick.x = pos.x;
		controller.RStick.y = pos.y;
	}).on("end", function(evt, data) {
		controller.RStick.x = 128;
		controller.RStick.y = 128;
	}).on("move", function(evt, data) {
		var pos = data.instance.frontPosition;
		pos.x = parseInt(((pos.x + 50) / 100) * 255);
		pos.y = parseInt(((pos.y + 50) / 100) * 255);
		pos.y = 255 - pos.y;
		controller.RStick.x = pos.x;
		controller.RStick.y = pos.y;
	})
}

function createJoysticks(evt) {
	leftStick = nipplejs.create(joysticks["leftStick"]);
	rightStick = nipplejs.create(joysticks["rightStick"]);
	bindJoysticks();
}


function sendTouchInputs() {

	if (!document.getElementById("touchControlsCheckbox").checked) {
		return;
	}
	var authCookie = getCookie("TwitchPlaysNintendoSwitch");
	if (authCookie == null) {
		$("#touchControlsCheckbox").prop("checked", false);
		swal("You need to connect to twitch!");
		//setCookie("AttemptedAuth", 1, 60);
		window.location.href = "https://twitchplaysnintendoswitch.com/8110/auth/twitch/";
		return;
	}
	//controller.reset();
	
	sendControllerState();
}

$("#touchControls")[0].style.display = "none";
$("#touchControlsCheckbox").on("click", function() {
	if ($(this).is(":checked")) {
		$("#touchControls")[0].style.display = "";
	} else {
		$("#touchControls")[0].style.display = "none";
	}
});

// 	$('#touchControlsCheckbox').checkboxpicker({
// 		html: true,
// 		offLabel: '<span class="glyphicon glyphicon-remove">',
// 		onLabel: '<span class="glyphicon glyphicon-ok">'
// 	});

keyboardTimer = setInterval(sendKeyboardInputs, 10);
gamepadTimer = setInterval(sendGamePadInputs, 10);
touchTimer = setInterval(sendTouchInputs, 10);





/* AUTH  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
$("#authenticateButton").on("click", function(event) {
	//setCookie("AttemptedAuth", 1, 60);
});


var authCookie = getCookie("TwitchPlaysNintendoSwitch");
var attemptedAuth = getCookie("AttemptedAuth");

// if (attemptedAuth && !authCookie) {
// 	window.location.href = "https://twitchplaysnintendoswitch.com/8110/";
// }
if (authCookie != null) {
	socket.emit("registerUsername", authCookie);
	$("#authenticateButton").remove();
}

setInterval(function() {
	if (authCookie != null) {
		socket.emit("registerUsername", authCookie);
		$("#authenticateButton").remove();
	}
}, 1000 * 60);



/* STREAM SETTINGS @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*/

$("#qualitySlider").on("input", function(event) {
	var quality = this.value;
	$("#quality").text(quality);
	socket.emit("setQuality", parseInt(quality));
})
$("#scaleSlider").on("input", function(event) {
	var scale = this.value;
	$("#scale").text(scale);
	socket.emit("setScale", parseInt(scale));
})
$("#fpsSlider").on("input", function(event) {
	var fps = this.value;
	$("#fps").text(fps);
	// 		socket.emit("setFPS", parseInt(fps));
})
$("#thresholdSlider").on("input", function(event) {
	var threshold = this.value;
	$("#threshold").text(threshold);
})

socket.on("setQuality", function(data) {
	$("#quality").text(data);
	$("#qualitySlider").val(data);
});
socket.on("setScale", function(data) {
	$("#scale").text(data);
	$("#scaleSlider").val(data);
});
socket.on("setFPS", function(data) {
	$("#fps").text(data);
	$("#fpsSlider").val(data);
});



/* LAGLESS 2.0 */
// Setup the WebSocket connection and start the player

// 	var client = new WebSocket( 'wss://' + "twitchplaysnintendoswitch.localtunnel.me" + '/ws' );
// 	var canvas = document.getElementById('videoCanvas');
// 	var player = new jsmpeg(client, {canvas:canvas});


/* LAGLESS 3.0 */
var canvas = document.getElementById("videoCanvas");
// Create h264 player
var uri = "wss://twitchplaysnintendoswitch.localtunnel.me";
var wsavc = new WSAvcPlayer(canvas, "webgl", 1, 35);




// 	wsavc.connect(uri);
getLatestImage();


/* SWITCH IMPLEMENTATIONS */

$(document).on("shown.bs.tab", 'a[data-toggle="tab"]', function(e) {

	var tab = $(e.target);
	var contentId = tab.attr("href");

	//This check if the tab is active
	if (tab.parent().hasClass("active")) {
		console.log("the tab with the content id " + contentId + " is visible");

		if (contentId == "#lagless1") {
			$("#screen").append("<img id='screenshot'></img>")

			wsavc.disconnect();
			lagless1Break = false;
			getLatestImage();
		} else if (contentId == "#lagless3") {

			setTimeout(function() {
				$("#screen").empty();
			}, 500);

			lagless1Break = true;
			var uri = "wss://twitchplaysnintendoswitch.localtunnel.me";
			wsavc.connect(uri);
		}

	} else {}

});


/* AUDIO */
// 	var webrtc = new SimpleWebRTC({
//         media: {
//             audio: true,
//             video: false
//         },
// 		// immediately ask for camera access
// 		//autoRequestMedia: true
// 	});
// 	// we have to wait until it's ready
// 	// doesn't want to work
// // 	webrtc.on("readyToCall", function() {
// // 		// you can name it anything
// // 		webrtc.joinRoom("TwitchPlaysNintendoSwitch");
// // 		console.log("joining");
// // 	});

// 	// just wait 2 seconds:
// 	setTimeout(function() {
// 		webrtc.joinRoom("TwitchPlaysNintendoSwitch");
// 		console.log("joining");
// 	}, 2000);


//     $("#toggleAudio").on("click", function() {

// 		toggleAudio = !toggleAudio;

// 		if(toggleAudio) {
// 			webrtc.joinRoom("TwitchPlaysNintendoSwitch");
// 			console.log("joining");
// 		} else {
// 			webrtc.leaveRoom();
// 			console.log("leaving");
// 		}

//     });


/* NEW AUDIO @@@@@@@@@@@@@@@@ */
var hash = window.location.hash.replace('#', '');
var meeting = new Meeting(hash);
var remoteMediaStreams = document.getElementById('remote-media-streams');
var localMediaStream = document.getElementById('local-media-stream');
var channel = "#twitchplaysnintendoswitch";
var sender = Math.round(Math.random() * 999999999) + 999999999;
var socket2 = io("https://twitchplaysnintendoswitch.com", {
	path: "/8110/socket.io/",
	transports: ['websocket'] // added
});
socket2.emit('new-channel', {
	channel: channel,
	sender: sender
});
//socket = io.connect(SIGNALING_SERVER + channel);
io.connect("https://twitchplaysnintendoswitch.com", {
	path: "/8110/socket.io/",
	transports: ['websocket'] // added
});
socket2.on('connect', function() {
	// setup peer connection & pass socket object over the constructor!
});
socket2.send = function(message) {
	socket.emit('message', {
		sender: sender,
		data: message
	});
};
meeting.openSignalingChannel = function(callback) {
	return socket.on('message', callback);
};
// on getting media stream
meeting.onaddstream = function(e) {
};
// using firebase for signaling
meeting.firebase = 'rtcweb';
// if someone leaves; just remove his audio
meeting.onuserleft = function(userid) {
	var audio = document.getElementById(userid);
	if (audio) audio.parentNode.removeChild(audio);
};
// check pre-created meeting rooms
meeting.check();


$("#toggleAudio").on("click", function() {
	toggleAudio = !toggleAudio;
	if (toggleAudio) {
		var icon = $(".glyphicon-volume-off");
		icon.removeClass("glyphicon-volume-off");
		icon.addClass("glyphicon-volume-up");
		audioElem.play();
	} else {
		var icon = $(".glyphicon-volume-up");
		icon.removeClass("glyphicon-volume-up");
		icon.addClass("glyphicon-volume-off");
		audioElem.pause();
	}
});


/* QUEUE @@@@@@@@@@@@@@@@@@@@@@@@@@@@@*/
socket.on("controlQueue", function(data) {
	controlQueue = data.queue;
	$("#controlQueue").empty();
	
	for (var i = 0; i < controlQueue.length; i++) {
		var username = controlQueue[i];
		var html = "<li class='list-group-item'>" + username + "</li>";
		$("#controlQueue").append(html);
	}
});

socket.on("twitchUsername", function(data) {
	twitchUsername = data;
});

socket.on("turnTimeLeft", function(data) {
	var timeLeft = data.timeLeft;
	var timeLeft2 = parseInt(data.timeLeft / 1000);
	
	var percent = parseInt((timeLeft / 30000) * 100);
	
	var progressBar = $(".progress-bar");
// 	progressBar.css("width", percent + "%").attr("aria-valuenow", percent + "%").text(percent + "%");
// 	progressBar.css("width", percent + "%").attr("aria-valuenow", percent + "%").text(timeLeft2 + " seconds");
	progressBar.css("width", percent + "%").attr("aria-valuenow", percent + "%").text(data.username + ": " + timeLeft2 + " seconds");
});


$("#cancelTurn").on("click", function(event) {
	socket.emit("cancelTurn");
});




/* DARK THEME @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*/

$("#toggleTheme").on("click", function() {
	toggleDarkTheme = !toggleDarkTheme;
	if (toggleDarkTheme) {
		var icon = $(".glyphicon-fire");
		icon.removeClass("glyphicon-fire");
		icon.addClass("glyphicon-certificate");
		
		$(".well").each(function() {
			$(this).removeClass("well");
			$(this).addClass("well-dark");
		});
		
		$(".list-group-item").each(function() {
			$(this).removeClass("list-group-item");
			$(this).addClass("list-group-item-dark");
		});
		
		$("body").addClass("dark");
		
		
// ::-webkit-scrollbar { width: 8px; height: 3px;}
// ::-webkit-scrollbar-button {  background-color: #666; }
// ::-webkit-scrollbar-track {  background-color: #646464;}
// ::-webkit-scrollbar-track-piece { background-color: #000;}
// ::-webkit-scrollbar-thumb { height: 50px; background-color: #666; border-radius: 3px;}
// ::-webkit-scrollbar-corner { background-color: #646464;}}
// ::-webkit-resizer { background-color: #666;}
// 		$("::-webkit-scrollbar").css("width: 8px; height: 3px;");
// 		$("::-webkit-scrollbar-button").css("background-color: #666;");
// 		$("::-webkit-scrollbar-track").css("background-color: #646464;");
// 		$("::-webkit-scrollbar-track-piece").css("background-color: #000;");
		
// 		$("::-webkit-scrollbar-thumb").css("height: 50px; background-color: #666; border-radius: 3px;");
// 		$("::-webkit-scrollbar-corner").css("background-color: #646464;");
// 		$("::-webkit-resizer").css("background-color: #666;");
		
	} else {
		var icon = $(".glyphicon-certificate");
		icon.removeClass("glyphicon-certificate");
		icon.addClass("glyphicon-fire");
		
		$(".well-dark").each(function() {
			$(this).removeClass("well-dark");
			$(this).addClass("well");
		});
		
		$(".list-group-item-dark").each(function() {
			$(this).removeClass("list-group-item-dark");
			$(this).addClass("list-group-item");
		});
		
		$("body").removeClass("dark");
	}
});
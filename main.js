var app = require("app");
var ipc = require("electron").ipcMain;
var BW = require("browser-window");

var globals = {
	tmpdir: require("os").tmpdir()
};
ipc.on("set-globals", function(event, pair) {
	globals[pair.key] = pair.value;
	event.returnValue = globals[pair.key];
});
ipc.on("get-globals", function(event, key) {
	if (typeof globals[key] == "undefined")
		event.returnValue = null;
	else
		event.returnValue = globals[key];
});

var loginWindow = null;
var vcodeWindow = null;
var mainWindow = null;

app.on("ready", function() {
	loginWindow = new BW({
		width: 400,
		height: 300,
		resizable: false,
		useContentSize: true
	});
	loginWindow.loadURL("file://" + __dirname + "/login.html");
//	loginWindow.openDevTools();
	loginWindow.on("closed", function() {
		if (vcodeWindow != null)
			vcodeWindow.destroy();
		app.quit();
	});
});

ipc.on("get-vcode", function(event, way) {
	vcodeWindow = new BW({
		width: 200,
		height: 150,
		resizable: false,
		minimizable: false,
		closable: false,
		alwaysOnTop: true
	});

	var login_sender = event.sender;
	ipc.on("submit-vcode", function(event, vcode) {
		login_sender.send("vcode-reply", {
			way: way,
			vcode: vcode
		});
		vcodeWindow.destroy();
	});

	vcodeWindow.loadURL("file://" + __dirname + "/vcode.html");
});

ipc.on("finish-login", function(event) {
	loginWindow.hide();
	mainWindow = new BW({
		width: 800,
		height: 600,
		useContentSize: true
	});
	
	mainWindow.loadURL("file://" + __dirname + "/main.html");
	mainWindow.on("closed", function() {
		app.quit();
	});
});

app.on("window-all-closed", function() {
	if (process.platform != "darwin") {
		app.quit();
	}
});
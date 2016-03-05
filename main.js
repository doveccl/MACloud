var app = require("app");
var ipc = require("electron").ipcMain;
var BW = require("browser-window");

var fs = require("fs");
var keytar = require("keytar");

var globals = {
	__NAME__: "MACloud",
	__VERSION__: "1.0.0",
	__EXP_TIME__: 3 * 24 * 60 * 60 * 1000, // 3 days in ms
	__PWD_FMT__: /"password"\s*:\s*"[^"]*"/g,
	tmpdir: require("os").tmpdir(),
	confdir: require("process").env.HOME + "/.MACloud",
	confile: require("process").env.HOME + "/.MACloud/config",
	config: false,
	cookies: false,
	tokens: false
};
fs.stat(globals["confdir"], function(err, stat) {
	if (err && err.errno == -2)
		fs.mkdirSync(globals["confdir"]);

	fs.readFile(globals["confile"], function(err, data) {
		if (data) { try {
			globals["config"] = JSON.parse(data);
			var config = globals["config"];
			for (var i in config.users) {
				var u = config.users[i];
				u.password = keytar.getPassword("MACloud", u.name);

				if (u.auth) {
					var now = new Date().getTime();
					if (now > u.auth.time + globals["__EXP_TIME__"])
						u.auth = false;
				}
			}
		} catch (e) {} }
	});
});
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

ipc.on("finish-login", function(event, user) {
	loginWindow.hide();

	if (!globals["config"])
		globals["config"] = {};
	if (!globals["config"].users)
		globals["config"].users = {};
	user.auth = {
		time: new Date().getTime(),
		cookies: globals["cookies"],
		tokens: globals["tokens"]
	};
	if (!globals["config"].default || user.auto)
		globals["config"].default = user.name;
	globals["config"].users[user.name] = user;

	if (keytar.getPassword(globals["__NAME__"], user.name) == null)
		keytar.addPassword(globals["__NAME__"], user.name, user.password);
	else
		keytar.replacePassword(globals["__NAME__"], user.name, user.password);

	var c_s = JSON.stringify(globals["config"]);
	c_s = c_s.replace(globals["__PWD_FMT__"], "\"password\":\"\"");
	fs.writeFileSync(globals["confile"], c_s);

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
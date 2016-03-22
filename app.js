var app = require("app");
var ipc = require("electron").ipcMain;
var BW = require("browser-window");

var fs = require("fs");
var keytar = require("keytar");

var urls = {
	main: "file://" + __dirname + "/template/main.html",
	login: "file://" + __dirname + "/template/login.html",
	vcode: "file://" + __dirname + "/template/vcode.html"
};
var consts = {
	name: "MACloud",
	version : "1.0.0",
	expire : 3 * 24 * 60 * 60 * 1000, // 3 days in ms
	pwdfmt: /("password"\s*:\s*")[^"]*(")/g,
	homedir: require("process").env.HOME
}
var globals = {
	tmpdir: require("os").tmpdir(),
	confdir: consts.homedir + "/.MACloud",
	confile: consts.homedir + "/.MACloud/config",
	config: false,
	cookies: false,
	tokens: false
};
fs.stat(globals.confdir, function(err, stat) {
	if (err && err.errno == -2)
		fs.mkdirSync(globals.confdir);

	fs.readFile(globals.confile, function(err, data) {
		if (data) { try {
			globals.config = JSON.parse(data);
			var config = globals.config;
			for (var i in config.users) {
				var u = config.users[i];
				u.password = keytar.getPassword(consts.name, u.name);

				if (u.auth) {
					var now = new Date().getTime();
					if (now > u.auth.time + consts.expire)
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

ipc.on("debug", function(event, log) {
	console.log(log);
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
	loginWindow.loadURL(urls.login);
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

	vcodeWindow.loadURL(urls.vcode);
});

ipc.on("finish-login", function(event, user) {
	loginWindow.hide();

	if (!globals.config)
		globals.config = {};
	if (!globals.config.users)
		globals.config.users = {};
	user.auth = user.remember ? {
		time: new Date().getTime(),
		cookies: globals.cookies,
		tokens: globals.tokens
	} : false;
	if (!globals.config.default || user.auto)
		globals.config.default = user.name;
	globals.config.users[user.name] = user;

	if (keytar.getPassword(consts.name, user.name) == null)
		keytar.addPassword(consts.name, user.name, user.password);
	else
		keytar.replacePassword(consts.name, user.name, user.password);

	var conf_str = JSON.stringify(globals.config);
	conf_str = conf_str.replace(consts.pwdfmt, "$1$2");
	fs.writeFileSync(globals.confile, conf_str);

	mainWindow = new BW({
		width: 800,
		height: 600,
		useContentSize: true
	});

	mainWindow.loadURL(urls.main);
	mainWindow.openDevTools();

	console.log(mainWindow.getBounds());
});

ipc.on("logout", function(event) {
	if (mainWindow.isVisible())
		mainWindow.destroy();
	loginWindow.show();
});

ipc.on("exit", function(event) {
	app.quit();
});

app.on("window-all-closed", function() {
	if (process.platform != "darwin") {
		app.quit();
	}
});

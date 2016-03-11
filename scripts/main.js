var ipc = require("electron").ipcRenderer;

var pcs = require("../scripts/pcs.js");
var globals = require("../scripts/globals.js");

var cookies = globals.get("cookies");
var tokens = globals.get("tokens");
var uk;

var SIZE = [
	[1, "B"], [Math.pow(2, 10), "K"],
	[Math.pow(2, 20), "M"], [Math.pow(2, 30), "G"],
	[Math.pow(2, 40), "T"], [Math.pow(2, 50), "P"]
];

logout.addEventListener("click", function() {
	ipc.send("logout");
});
quit.addEventListener("click", function() {
	ipc.send("exit");
});

function show_error(str) {
	error.innerHTML = str;
	err_dlg.showModal();
}

pcs.get_quota(cookies, on_get_quota);
pcs.get_uk(cookies, on_get_uk);

function on_get_quota(res) {
	var data = "";
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		data = JSON.parse(data);
		var e = data.used * 100 / data.total;
		quota.MaterialProgress.setProgress(e);

		for (e = 5; SIZE[e][0] > data.used; e--);
		data.used /= SIZE[e][0];
		data.used = data.used.toFixed(1);
		used.innerHTML = data.used + SIZE[e][1];
		for (e = 5; SIZE[e][0] > data.total; e--);
		data.total /= SIZE[e][0];
		data.total = data.total.toFixed(1);
		total.innerHTML = data.total + SIZE[e][1];
	});
}

function on_get_uk(res) {
	var data = "";
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		uk = data.match(/.+home\?uk=(\d+).+/);
		if (uk = uk[0])
			uk = uk.match(/\d+/)[0];

		pcs.get_user_info(tokens, uk, on_get_user_info);
	});
}

function on_get_user_info(res) {
	var data = "";
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		data = JSON.parse(data);
		if (data.errno == 0) {
			data = data.user_info;
			uname.innerHTML = data.uname;
			avatar.src = data.avatar_url;
		}
	});
}
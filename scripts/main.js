var ipc = require("electron").ipcRenderer;

var pcs = require("../scripts/pcs.js");
var globals = require("../scripts/globals.js");

var shift = false;

var cookies = globals.get("cookies");
var tokens = globals.get("tokens");
var file_list = {};
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

var cover = null;
files.addEventListener("mousedown", function(e) {
	if (cover && cover.outerHTML)
		cover.outerHTML = "";
	cover = document.createElement("div");
	cover.id = "cover";
	cover.style.width = 0;
	cover.style.height = 0;
	cover.style.left = e.offsetX + "px";
	cover.style.top = e.offsetY + "px";
	cover.dataset.x = e.offsetX;
	cover.dataset.y = e.offsetY;
	files.appendChild(cover);
});
files.addEventListener("mousemove", function(e) {
	if (cover == null) return ;
	var rect = files.getBoundingClientRect();
	var _x = e.clientX - rect.left;
	var _y = e.clientY - rect.top;
	var x = parseInt(cover.dataset.x);
	var y = parseInt(cover.dataset.y);
	cover.style.width = Math.abs(x - _x) + "px";
	cover.style.height = Math.abs(y - _y) + "px";
	cover.style.left = Math.min(x, _x) + "px";
	cover.style.top = Math.min(y, _y) + "px";
});
document.body.addEventListener("mouseup", function(e) {
	if (cover && cover.outerHTML)
		cover.outerHTML = "";
	cover = null;
	if (e.shiftKey == false) {
		var ss = document.querySelectorAll(".selected");
		for (var i in ss) ss[i].className = "";
	}
});

function timestamp(inc) {
	if (typeof inc != "number")
		inc = 0;
	return new Date().getTime() + inc;
}
function str_time(ts) {
	var date = new Date(ts);
	Y = date.getFullYear() + '-';
	M = date.getMonth() + '-';
	D = date.getDate() + ' ';
	h = date.getHours() + ':';
	m = date.getMinutes() + ':';
	s = date.getSeconds(); 
	return Y + M + D + h + m + s;
}


function show_error(str) {
	files.className = "";
	error.innerHTML = str;
	err_dlg.showModal();
}

function add_file(f) {
	var name = f.server_filename;
	var type = name.replace(/([^.]*\.)*([^.]+)$/g, "$2");
	if (f.isdir) type = "dir";

	var file = document.createElement("div");
	var ico = document.createElement("div");
	var thumbs = document.createElement("img");
	var fname = document.createElement("div");

	ico.className = "ico " + type;
	thumbs.className = "thumbs";
	fname.className = "fname";
	fname.innerHTML = name;

	if (f.thumbs && f.thumbs.icon) {
		thumbs.src = f.thumbs.icon;
		ico.className += " loading";
		ico.appendChild(thumbs);
	}

	file.title = "名称：" + f.server_filename + "\n" +
		"创建时间：" + str_time(f.server_ctime * 1000) + "\n" +
		"修改时间：" + str_time(f.server_mtime * 1000);

	file.appendChild(ico);
	file.appendChild(fname);
	files.appendChild(file);

	file.addEventListener("click", function(e) {
		if (file.className != "selected") {
			if (e.shiftKey == false) {
				var ss = document.querySelectorAll(".selected");
				for (var i in ss) ss[i].className = "";
			}
			file.className = "selected";
		} else {
			if (type == "dir" && timestamp(-500) <= file.dataset.ctime)
				get_files(f.path);
			if (e.shiftKey)
				file.className = "";
		}
		file.dataset.ctime = timestamp();
		e.stopPropagation();
	});
	file.addEventListener("mousedown", function(e) {
		e.stopPropagation();
	});
	file.addEventListener("mouseup", function(e) {
		e.stopPropagation();
	});
}

function get_files(path) {
	if (fbox.className == "loading")
		return ;
	file_list.path = path;
	file_list.page = 1;
	file_list.data = [];
	fbox.className = "loading";
	files.innerHTML = "";
	show_path(path);
	pcs.get_dirs(cookies, tokens, path, on_get_dirs);
}
function show_path(path) {
	if (path == "/") path = "";
	var p = (" " + path).split("/"), a;
	var index = [], len = p.length;
	a = document.createElement("a");
	a.href = "javascript:get_files('/');";
	a.innerHTML = "所有文件";
	index.push(a.outerHTML);
	if (len > 3) {
		a.removeAttribute("href");
		a.innerHTML = "...";
		index.push(a.outerHTML);
		p[0] = path.replace(/\/[^/]+$/g, "");
		p[0] = p[0].replace(/\/[^/]+$/g, "");
		p[1] = p[len - 2];
		p[2] = p[len - 1];
		len = 3;
	} else p[0] = "";
	for (var i = 1; i < len; i++) {
		p[0] += "/" + p[i];
		a.innerHTML = p[i];
		if (i + 1 == len)
			a.removeAttribute("href");
		else
			a.href = "javascript:get_files('" + p[0] + "');";
		index.push(a.outerHTML);
	}

	title.innerHTML = index.join("<b>&gt;</b>");
}
function show_files() {
	fbox.className = "";
	if (file_list.data.length == 0)
		fbox.className = "empty";
	for (var i in file_list.data)
		add_file(file_list.data[i]);
}

pcs.get_quota(cookies, on_get_quota);
pcs.get_uk(cookies, on_get_uk);
get_files("/");

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

function on_get_dirs(res) {
	var data = "", type;
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		data = JSON.parse(data);
		if (data.errno == 0) {
			file_list.data = file_list.data.concat(data.list);
			if (data.list.length < 100)
				show_files();
			else
				pcs.get_dirs(
					cookies, tokens, file_list.path,
					on_get_dirs, ++file_list.page
				);
		} else
			show_error("获取文件列表失败");
	});
}
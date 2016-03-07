var NodeRsa = require("node-rsa");
var qs = require("querystring");
var ipc = require("electron").ipcRenderer;

var auth = require("../scripts/auth.js");
var globals = require("../scripts/globals.js");

var user_name, user_password;
var cookies = {}, tokens = {};
var vcode = "", codeString, vcodetype;

function add_cookie(cookie) {
	cookie = cookie.replace(/(;.*)*$/g, "");
	cookie = cookie.split("=");
	cookies[cookie[0]] = [];
	for (var i  = 1; i < cookie.length; i++)
		cookies[cookie[0]].push(cookie[i]);
	cookies[cookie[0]] = cookies[cookie[0]].join("=");
}

var conf = globals.get("config");
function fill_form(user_name) {
	if (!conf.users) return false;
	var user = conf.users[user_name];
	if (!user) return false;

	if (typeof user.name == "string")
		if (uname.value != user.name)
			uname.value = user.name;
	if (typeof user.password == "string")
		if (user.remember)
			password.value = user.password;
	if (typeof user.remember == "boolean")
		remember.checked = user.remember;
	if (typeof user.auto == "boolean")
		auto.checked = user.auto;

	var pn = remember.parentNode;
	if (remember.checked && !pn.className.match("is-checked"))
		pn.className += " is-checked";
	if (!remember.checked && pn.className.match("is-checked"))
		pn.className = pn.className.replace("is-checked", "");
	pn = auto.parentNode;
	if (auto.checked && !pn.className.match("is-checked"))
		pn.className += " is-checked";
	if (!auto.checked && pn.className.match("is-checked"))
		pn.className = pn.className.replace("is-checked", "");

	pn = password.parentNode;
	if (password.value != "" && !pn.className.match("is-dirty"))
		pn.className += " is-dirty";
	if (password.value == "" && pn.className.match("is-dirty"))
		pn.className = pn.className.replace("is-dirty", "");

	return user.auto;
}
if (conf.default) {
	if (fill_form(conf.default))
		do_login();
}

auto.addEventListener("click", function() {
	if (this.checked) {
		remember.checked = true;
		var pn = remember.parentNode;
		if (!pn.className.match("is-checked"))
			pn.className += " is-checked";
	}
});
uname.addEventListener("input", function() {
	password.value = "";
	remember.checked = false;
	auto.checked = false;
	var pn = remember.parentNode;
	pn.className = pn.className.replace("is-checked", "");
	pn = auto.parentNode;
	pn.className = pn.className.replace("is-checked", "");
	pn = password.parentNode;
	pn.className = pn.className.replace("is-dirty", "");
	fill_form(uname.value);
});

function update_status(str) {
	error.parentNode.className = "loading";
	if (typeof str == "string")
		login.innerHTML = str;
}
function restore_login() {
	error.parentNode.className = "";
	for (var i = 0; i < inputs.length; i++)
		inputs[i].disabled = false;

	login.disabled = false;
	login.innerHTML = "登录";
}
function show_error(e) {
	error.innerHTML = e;
	error.parentNode.className = "";
	error.style.display = "block";
	error.className = "shake";
	setTimeout(function() {
		error.className = "";
		restore_login();
	}, 500);
}

login.addEventListener("click", do_login);
function do_login() {
	if (uname.value == "") {
		show_error("请输入用户名");
		return ;
	}
	if (password.value == "") {
		show_error("请输入密码");
		return ;
	}

	for (var i = 0; i < inputs.length; i++)
		inputs[i].disabled = true;

	error.style.display = "none";
	login.disabled = true;

	if (conf.users[uname.value])
		if (conf.users[uname.value].auth) {
			var me = conf.users[uname.value];
			update_status("验证 Cookies ...");
			auth.test_cookies(me, on_test_finish);
			return ;
		}

	user_name = uname.value;
	user_password = password.value;

	cookies = {};
	tokens = {};
	update_status("获取 BAIDUID ...");
	auth.get_BAIDUID(on_get_BAIDUID);
}

function on_test_finish(res) {
	var me = conf.users[uname.value];
	if (res.headers["location"].indexOf("v2/?login") == -1) {
		if (me.password == password.value) {
			globals.set("cookies", me.auth.cookies);
			globals.set("tokens", me.auth.tokens);
			ipc.send("finish-login", {
				name: uname.value,
				password: password.value,
				remember: remember.checked,
				auto: auto.checked
			});
			restore_login();
		} else
			show_error("密码错误");
	} else {
		me.auth = false;
		do_login();
	}
}

ipc.on("vcode-reply", function(event, res) {
	vcode = res.vcode;
	console.log(vcode);
	codeString = globals.get("codeString");
	if (res.way == "check-login") {
		update_status("获取公钥 ...");
		auth.get_public_key(cookies, tokens, on_get_key);
	} else if (res.way == "post-login") {
		auth.post_login(
			cookies, tokens,
			user_name, pwd_enc,
			d.key, vcode, codeString,
		on_post_login);
	}
});

function on_get_BAIDUID(res) {
	if (c = res.headers["set-cookie"]) {
		for (var i in c)
			add_cookie(c[i]);
		update_status("获取 token ...");
		auth.get_token(cookies, on_get_token);
	} else
		show_error("获取 BAIDUID 失败");
}

function on_get_token(res) {
	if (c = res.headers["set-cookie"])
		for (var i in c)
			add_cookie(c[i]);
	var data = "";
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		data = data.replace(/\'/g, "\"");
		try {
			var d = JSON.parse(data);
			tokens.token = d.data.token;
			add_cookie("cflag=65535%3A1");
			add_cookie("PANWEB=1");
			update_status("获取 UBI ...");
			auth.get_UBI(cookies, tokens, on_get_UBI);
		} catch(e) {
			show_error("获取 token 失败");
		}
	});
}

function on_get_UBI(res) {
	if (c = res.headers["set-cookie"]) {
		for (var i in c)
			add_cookie(c[i]);
		update_status("登录验证 ...");
		auth.check_login(user_name, cookies, tokens, on_check_login);
	}
	else
		show_error("获取 UBI 失败");
}

function on_check_login(res) {
	if (c = res.headers["set-cookie"]) {
		for (var i in c)
			add_cookie(c[i]);
		var data = "";
		res.on("data", function(d) {
			data += d;
		}).on("end", function() {
			data = data.toString();
			data = data.replace(/\'/g, "\"");
			var d = JSON.parse(data);
			vcodetype = d.data.vcodetype;
			if (codeString = d.data.codeString) {
				globals.set("cookies", cookies);
				globals.set("tokens", tokens);
				globals.set("codeString", codeString);
				globals.set("vcodetype", vcodetype);
				ipc.send("get-vcode", "check-login");
			} else {
				update_status("获取公钥 ...");
				auth.get_public_key(cookies, tokens, on_get_key);
			}
		});
	} else
		show_error("登录验证失败");
}

function on_get_key(res) {
	var data = "";
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		data = data.toString();
		data = data.replace(/\'/g, "\"");
		var d = JSON.parse(data), pubkey;
		if (pubkey = d.pubkey) {
			var key = new NodeRsa(pubkey, {
				encryptionScheme: "pkcs1"
			});
			var pwd_enc = key.encrypt(user_password, "base64");
			update_status("验证密码 ...");
			auth.post_login(
				cookies, tokens,
				user_name, pwd_enc,
				d.key, vcode, codeString,
			on_post_login);
		} else
			show_error("获取公钥失败");
	});
}

function on_post_login(res) {
	if (c = res.headers["set-cookie"])
		for (var i in c)
			add_cookie(c[i]);
	globals.set("cookies", cookies);

	var data = "";
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		
		var d = data.match(/"(err_no[^"]+)"/);
		if (d = d[0]) {
			d = d.replace(/^"(err_no[^"]+)"$/, "$1");
			d = qs.parse(d);

			if (d.err_no == 0 || d.err_no == 18) {
				update_status("获取 bdstoken ...");
				auth.get_bdstoken(cookies, on_get_bdstoken);
			} else if (d.err_no == 257) {
				vcodetype = d.vcodetype;
				codeString = d.codeString;
				globals.set("codeString", codeString);
				globals.set("vcodetype", vcodetype);
				ipc.send("get-vcode", "post-login");
			} else if (d.err_no == 4)
				show_error("密码错误");
			else if (d.err_no == 6)
				show_error("验证码错误");
			else if (d.err_no == 400031 || d.err_no == 120019)
				show_error("账号异常，需要认证");
			else show_error("未知错误");
		} else
			show_error("验证密码失败");
	});
}

function on_get_bdstoken(res) {
	var data = "";
	res.on("data", function(d) {
		data += d;
	}).on("end", function() {
		tokens["bdstoken"] = "";
		data = data.match(/"bdstoken"\s*:\s*"([^"]+)"/);
		if (data) {
			data = data[0];
			data = data.replace(/^"bdstoken"\s*:\s*"([^"]+)"$/, "$1");
			tokens["bdstoken"] = data;

			globals.set("cookies", cookies);
			globals.set("tokens", tokens);
			ipc.send("finish-login", {
				name: uname.value,
				password: password.value,
				remember: remember.checked,
				auto: auto.checked
			});
			restore_login();
		} else
			show_error("获取 bdstoken 失败");
	});
}

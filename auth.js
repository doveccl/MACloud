var http = require("http");
var https = require("https");
var qs = require("querystring");

var ACCEPT_HTML = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

function cookies_stringify(cookies, ol) {
	var list = [];
	if (typeof ol == "undefined")
		for (var i in cookies)
			list.push(i + "=" + cookies[i]);
	else
		for (var i in ol)
			if (typeof cookies[ol[i]] != "undefined")
				list.push(ol[i] + "=" + cookies[ol[i]]);
	return list.join(";");
}

function get_ppui_logintime() {
	// randint: 52000 ~ 58535
	var inc = Math.random() * 6534;
	return parseInt(inc) + 52000;
}

exports.get_BAIDUID = function(callback) {
	var data = {
		tpl: "mn",
		apiver: "v3",
		tt: new Date().getTime(),
		class: "login",
		logintype: "basicLogin"
	};
	var options = {
		hostname: "passport.baidu.com",
		path: "/v2/api/?getapi&" + qs.stringify(data),
		headers: { Referer: "" }
	};
	https.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.get_token = function(cookies, callback) {
	var data = {
		tpl: "pp",
		apiver: "v3",
		tt: new Date().getTime(),
		class: "login",
		logintype: "basicLogin"
	};
	var options = {
		hostname: "passport.baidu.com",
		path: "/v2/api/?getapi&" + qs.stringify(data),
		headers: {
			Cookie: cookies_stringify(cookies),
			Accept: ACCEPT_HTML,
			"Cache-control": "max-age=0"
		}
	};
	https.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.get_UBI = function(cookies, tokens, callback) {
	var data = {
		tpl: "pp",
		apiver: "v3",
		tt: new Date().getTime(),
		token: tokens.token
	};
	var options = {
		hostname: "passport.baidu.com",
		path: "/v2/api/?loginhistory&" + qs.stringify(data),
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "https://passport.baidu.com/v2/?login"
		}
	};
	https.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.check_login = function(uname, cookies, tokens, callback) {
	var data = {
		tpl: "mm",
		apiver: "v3",
		tt: new Date().getTime(),
		token: tokens.token,
		username: uname,
		isphone: false
	};
	var options = {
		hostname: "passport.baidu.com",
		path: "/v2/api/?logincheck&" + qs.stringify(data),
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "https://passport.baidu.com/v2/?login"
		}
	};
	https.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.get_vcode = function(cookies, codeString, callback) {
	var options = {
		hostname: "passport.baidu.com",
		path: "/cgi-bin/genimage?" + codeString,
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "https://passport.baidu.com/v2/?login"
		}
	};
	https.get(options, callback).on("error", function(e) {
		console.error(e.message);
	});
}

exports.refresh_vcode = function(cookies, tokens, vcodetype, callback) {
	var data = {
		tpl: "pp",
		apiver: "v3",
		tt: new Date().getTime(),
		token: tokens.token,
		fr: "ligin",
		vcodetype: vcodetype
	};
	var options = {
		hostname: "passport.baidu.com",
		path: "/v2/?reggetcodestr&" + qs.stringify(data),
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "https://passport.baidu.com/v2/?login"
		}
	};
	https.get(options, callback).on("error", function(e) {
		console.error(e.message);
	});
}

exports.get_public_key = function(cookies, tokens, callback) {
	var data = {
		tpl: "pp",
		apiver: "v3",
		tt: new Date().getTime(),
		token: tokens.token
	};
	var options = {
		hostname: "passport.baidu.com",
		path: "/v2/getpublickey?" + qs.stringify(data),
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "https://passport.baidu.com/v2/?login"
		}
	};
	https.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.post_login = function(cok, tkn, nam, pwd, key, vcd, cds, callback) {
	var data = {
		staticpage: "https://passport.baidu.com/static/passpc-account/html/v3Jump.html",
		apiver: "v3",
		charset: "UTF-8",
		token: tkn.token,
		tpl: "pp", subpro: "",
		apiver: "v3",
		tt: new Date().getTime(),
		codestring: cds,
		safeflg: 0,
		u: "http://passport.baidu.com/",
		isPhone: "", quick_user: 0,
		logintype: "basicLogin",
		logLoginType: "pc_loginBasic",
		idc: "", loginmerge: true,
		username: nam,
		password: pwd,
		verifycode: vcd,
		mem_pass: "on",
		rsakey: key,
		crypttype: 12,
		ppui_logintime: get_ppui_logintime(),
		callback: "parent.bd__pcbs__28g1kg"
	};
	data = qs.stringify(data);
	var options = {
		hostname: "passport.baidu.com",
		path: "/v2/api/?login",
		method: "POST",
		headers: {
			Cookie: cookies_stringify(cookies, [
				"BAIDUID","HOSUPPORT", "UBI"
			]),
			Accept: ACCEPT_HTML,
			Referer: "https://passport.baidu.com/v2/?login",
			Connection: "Keep-Alive",
			"Content-Type": "application/x-www-form-urlencoded",
			"Content-Length": Buffer.byteLength(data)
		}
	};
	var req = https.request(options, callback).on("error", function(e) {
		show_error(e.message);
	});
	req.write(data);
	req.end();
}

exports.get_bdstoken = function(cookies, callback) {
	var options = {
		hostname: "pan.baidu.com",
		path: "/disk/home",
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "http://pan.baidu.com/disk/home",
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36"
		}
	};
	http.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.test_cookies = function(user, callback) {
	var options = {
		hostname: "passport.baidu.com",
		headers: {
			Cookie: cookies_stringify(user.auth.cookies),
			Referer: "https://passport.baidu.com/"
		}
	};
	https.get(options, callback).on("error", function(e) {
		console.error(e.message);
	});
}

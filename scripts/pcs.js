var http = require("http");
var https = require("https");
var qs = require("querystring");

var USER_AGENT = 'netdisk;4.5.0.7;PC;PC-Windows;5.1.2600;WindowsBaiduYunGuanJia';
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

exports.get_quota = function(cookies, callback) {
	var data = {
		channel: "chunlei",
		clienttype: 0, web: 1,
		tt: new Date().getTime()
	};
	var options = {
		hostname: "pan.baidu.com",
		path: "/api/quota?" + qs.stringify(data),
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "http://pan.baidu.com/disk/home",
			"User-Agent": USER_AGENT
		}
	};
	http.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.get_uk = function(cookies, callback) {
	var options = {
		hostname: "yun.baidu.com",
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "http://pan.baidu.com/disk/home",
			"User-Agent": USER_AGENT
		}
	};
	http.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}

exports.get_user_info = function(tokens, uk, callback) {
	var data = {
		channel: "chunlei",
		clienttype: 0, web: 1,
		bdstoken: tokens.bdstoken,
		query_uk: uk,
		t: new Date().getTime()
	};
	var options = {
		hostname: "pan.baidu.com",
		path: "/pcloud/user/getinfo?" + qs.stringify(data),
		headers: {
			Cookie: cookies_stringify(cookies),
			Referer: "http://pan.baidu.com/disk/home",
			"User-Agent": USER_AGENT
		}
	};
	http.get(options, callback).on("error", function(e) {
		show_error(e.message);
	});
}
var ipc = require("electron").ipcRenderer;

exports.set = function(key, value) {
	return ipc.sendSync('set-globals', {
		key: key,
		value: value
	});
};

exports.get = function(key) {
	return ipc.sendSync('get-globals', key);
};

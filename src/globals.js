var fs = require('fs');

/**
 * @type {{getLogger: Function}|exports}
 */
var logger = require('log4js');
/**
 * @type {request|exports|{jar: Function}}
 */
var request = require('request');
var FileCookieStore = require('tough-cookie-filestore');
/**
 * @type {p|path|{join: Function, datadir: Function}}|exports}
 */
var pathExtra = require('path-extra');

var DIR_TEAM = pathExtra.datadir('IFDevelopment');
var DIR_APP = pathExtra.join(DIR_TEAM, 'NodeBeam');

var jars = [];

exports.getJar = function (username) {
    username = username.toLowerCase();

    if (jars[username] == null) {
        if (!fs.existsSync(DIR_TEAM))
            fs.mkdirSync(DIR_TEAM);

        if (!fs.existsSync(DIR_APP))
            fs.mkdirSync(DIR_APP);

        var file = pathExtra.join(DIR_APP, 'cookies_' + username + '.tmp');

        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, '{}');
        }

        jars[username] = request.jar(new FileCookieStore(file));
    }

    return jars[username];
};

exports.logger = logger.getLogger('[node-beam]');

exports.headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.35 Safari/537.36'
};
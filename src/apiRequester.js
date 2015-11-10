var request = require('request');

var Globals = require('./globals');

/**
 * @param jar
 * @returns {APIRequest}
 * @constructor
 */
function APIRequester(jar) {
    /**
     * @param {String} method
     * @param {Object} data
     * @param {String} endpoint
     * @param {Function} callback
     */
    function APIRequest(method, data, endpoint, callback) {
        if (['delete', 'get', 'patch', 'post', 'put'].indexOf(method) < 0) return;
        if (!data) data = {};

        var options = {
            method: method,
            json: true,
            url: endpoint,
            baseUrl: 'https://beam.pro/api/v1/',
            headers: Globals.headers
        };

        if (method == 'get') {
            options.qs = data;
        } else if (['patch', 'post', 'put'].indexOf(method) > -1) {
            options.body = data;
        }

        if (jar != null) {
            options.jar = jar;
        }

        request(options, function (err, res, body) {
            callback(res ? res.statusCode : -1000, body, res.headers);
        });
    }

    return APIRequest;
}

module.exports = function (username) {
    return new APIRequester(username != null ? Globals.getJar(username) : null);
};
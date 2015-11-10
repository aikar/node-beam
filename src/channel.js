var User = require('./user');

/**
 * @param {{
 *     id: Number,
 *     name: String,
 *     token: String,
 *     createdAt: String,
 *     updatedAt: String,
 *     follows: Object[]
 * }} data
 * @returns {Channel}
 * @constructor
 */
var Channel = function (data) {
    this.id = data.id >= 0 ? data.id : -1;

    this.name = data.name || '';
    this.description = data.description || '';
    this.token = data.token || '';

    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);

    this.online = data.online;
    this.featured = data.featured;
    this.partnered = data.partnered;

    this.numFollowers = data.numFollowers || 0;

    this.type = data.type || null;
    this.typeId = data.typeId || (data.type != null ? data.type.id : null);

    this.user = typeof data.user == 'object' ? User.createChannelUser(data) : data.user;

    this.toString = function () {
        return this.token;
    };

    return this;
};

exports.createChannel = function (data) {
    return new Channel(data);
};
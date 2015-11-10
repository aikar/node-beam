var Channel = require('./channel');

/**
 * @param {{
 *     id: Number,
 *     username: String,
 *     display_name: String,
 *     social_twitter: String,
 *     social_facebook: String,
 *     social_youtube: String,
 *     createdAt: String,
 *     updatedAt: String,
 *     follows: Object[],
 *     channel: Object
 * }} data
 * @returns {User}
 * @constructor
 */
var User = function (data) {
    this.id = data.id >= 0 ? data.id : -1;

    this.username = data.username || 'User';
    //noinspection JSUnusedGlobalSymbols
    this.displayName = data.display_name || this.username;

    //noinspection JSUnusedGlobalSymbols
    this.social = {
        twitter: data.social_twitter,
        facebook: data.social_facebook,
        youtube: data.social_youtube
    };

    this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;

    this.follows = data.follows || [];

    this.channel = data.channel ? Channel.createChannel(data.channel) : null;

    //noinspection JSUnusedGlobalSymbols
    this.rank = [];

    return this;
};

exports.createUser = function (data) {
    return new User(data);
};

exports.createChannelUser = function (data) {
    var user = data.user;

    user.createdAt = data.createdAt;
    user.updatedAt = data.updatedAt;

    return new User(user);
};
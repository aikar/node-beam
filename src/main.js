var util = require('util');
var EventEmitter = require('events').EventEmitter;

var request = require('request');

var ChatSocket = require('./chatSocket');
var User = require('./user');
var Channel = require('./channel');

var Globals = require('./globals');
var Utils = require('./utils');
var LiveLoading = require('./liveloading');

var APIRequester = require('./apiRequester');
var InternLiveLoading = null;

var NodeBeam = function (config) {
    if (config == null || config.username == null || config.password == null) {
        throw new Error('Missing authentication informations');
    }

    var OpenChatSockets = [];

    var TheUser;
    var _users = [];
    var _channels = [];

    var APIRequest = APIRequester(config.username);

    var that = this;
    var reconnect = false;
    var settings = {
        autoReconnect: config.settings != null && config.settings.autoReconnect != null ? config.settings.autoReconnect : true,
        autoJoinOwnChannel: config.settings != null && config.settings.autoJoinOwnChannel != null ? config.settings.autoJoinOwnChannel : true
    };

    /**
     * @param {String} username Username
     * @param {String} password Password
     * @param {String} auth Two-factor authentication
     * @param {Function} callback (HTTP code, response)
     */
    function Login(username, password, auth, callback) {
        Globals.logger.info('Checking if logged in');
        APIRequest('get', {}, 'users/current', function (code, response) {
            var loggedIn = code == 200;

            if (!loggedIn) {
                Globals.logger.info('Logging in');

                var data = {
                    username: username,
                    password: password
                };

                if (auth != null && auth.length == 6) {
                    data.code = auth;
                }

                APIRequest('post', data, 'users/login', function (code, response) {
                    callback(code, response);
                });
                return;
            }

            Globals.logger.info('Logged in');
            callback(200, response);
        });
    }

    function OnLoggedIn(userData) {
        TheUser = User.createUser(userData);
        _users[TheUser.id] = TheUser;
        if (!reconnect) {
            reconnect = true;
            if (settings.autoJoinOwnChannel) {
                that.joinChannel(TheUser.channel);
            }
            that.emit('ready');
        }
    }

    /**
     * Join channel
     *
     * @param {Channel} channel
     * @throws {Error}
     */
    this.joinChannel = function (channel) {
        if (channel == null || isNaN(channel.id)) {
            Globals.logger.warn('Missing channel', channel);
            return;
        }

        if (OpenChatSockets[Utils.cleanChannelToken(channel)] != null) {
            Globals.logger.warn('Already connected to channel ' + Utils.cleanChannelToken(channel));
            return;
        }

        var chatSocket = ChatSocket.Connect(that, TheUser, channel);

        chatSocket.on('channel:join', function (channel, reconnect) {
            that.emit('channel:join', channel, reconnect);
        });
        chatSocket.on('channel:leave', function (channel) {
            OpenChatSockets[Utils.cleanChannelToken(channel)] = null;
            that.emit('channel:leave', channel);
        });

        chatSocket.on('user:join', function (user, initial) {
            that.emit('user:join', channel, user, initial);
        });
        chatSocket.on('user:update', function (user) {
            that.emit('user:update', channel, user);
        });
        chatSocket.on('user:leave', function (user) {
            that.emit('user:leave', channel, user);
        });

        chatSocket.on('chat:delete', function (cid) {
            that.emit('chat:delete', channel, cid);
        });
        chatSocket.on('chat:clear', function () {
            that.emit('chat:clear', channel);
        });
        chatSocket.on('chat:message', function (channel, user, message) {
            message.cleanMessage = Utils.cleanHTMLMessage(message.cleanMessage);

            message.sendMessage = function () {
                var message = Array.prototype.slice.call(arguments).join(' ');

                message = message.split('@user').join(user.username);

                return that.sendMessage(channel.token, message);
            };
            message.deleteMessage = function (callback) {
                APIRequest('delete', {}, 'chats/' + channel.id + '/message/' + message.id, function (code, response) {
                    if (callback != null)
                        callback(response);
                });
            };

            that.emit('chat:message', channel, user, message);
        });

        OpenChatSockets[Utils.cleanChannelToken(channel)] = chatSocket;
    };

    this.leaveChannel = function (channel) {
        channel = Utils.cleanChannelToken(channel);

        if (OpenChatSockets[channel]) {
            OpenChatSockets[channel].close();
            OpenChatSockets[channel] = null;
        }
    };

    /**
     * @param {String|Object} channel
     * @param {Function} callback
     * @param {Boolean} [forceNoCaching] If true, ignores cache and don't save to cache.
     * @param {Boolean} [forceNoLiveLoading] If true, does not subscribe to liveloading to keep online, title, etc up-to-date (Not recommended with caching)
     */
    this.getChannel = function (channel, callback, forceNoCaching, forceNoLiveLoading) {
        var that = this;

        var channelToken = Utils.cleanChannelToken(channel);

        if (!forceNoCaching && _channels[channelToken] != null) {
            return _channels[channelToken];
        }

        APIRequest('get', {}, 'channels/' + channelToken, function (code, response) {
            if (code === 200) {
                var channel = Channel.createChannel(response);

                if (!forceNoLiveLoading) {
                    if (InternLiveLoading == null) {
                        InternLiveLoading = new LiveLoading();
                    }

                    InternLiveLoading.subscribe('channel:' + channel.id + ':update', function (updateData) {
                        if (updateData.online != null && channel.online != updateData.online) {
                            channel.online = updateData.online;
                            that.emit('channel:' + channel.id + ':online', channel.online);
                        }
                        if (updateData.name != null) {
                            channel.name = updateData.name;
                            that.emit('channel:' + channel.id + ':name', channel.name);
                        }
                        if (updateData.description != null) {
                            channel.description = updateData.description;
                            that.emit('channel:' + channel.id + ':description', channel.description);
                        }
                        if (updateData.typeId != null && channel.typeId != updateData.typeId) {
                            channel.typeId = updateData.typeId;
                            APIRequest('get', {
                                where: 'id.eq.' + updateData.typeId
                            }, 'types', function (code, response) {
                                if (code === 200 && response.length > 0) {
                                    if (response[0].id == channel.typeId) {
                                        channel.type = response[0];
                                        that.emit('channel:' + channel.id + ':type', channel.type);
                                    }
                                }
                            });
                        }

                        that.emit('channel:' + channel.id + ':update', updateData);
                    });
                }

                callback(forceNoCaching ? channel : _channels[channelToken] = channel);
                return;
            } else if (code === 404) {
                callback(null);
                return;
            }

            setImmediate(function () {
                that.getChannel(channel, callback);
            });
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Unloads a channel.
     *
     * Stops updating the channel info and leaves the channel if connected.
     *
     * @param {Channel} channel
     */
    this.unloadChannel = function (channel) {
        var channelToken = Utils.cleanChannelToken(channel);

        if (_channels[channelToken] != null) {
            if (OpenChatSockets[Utils.cleanChannelToken(channel)] != null) {
                this.leaveChannel(channel);
            }

            InternLiveLoading.unsubscribe('channel:' + channel.id + ':update');
            _channels[channelToken] = null;
        }
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * @param {Number} userID
     * @param {Function} [callback]
     * @returns {*}
     */
    this.getUser = function (userID, callback) {
        if (_users[userID] != null) {
            if (callback != null)
                callback(_users[userID]);
            return _users[userID];
        }

        APIRequest('get', {}, 'users/' + userID, function (code, response) {
            _users[userID] = User.createUser(response);
            if (callback != null)
                callback(_users[userID]);
        });

        return null;
    };

    /**
     * @param {String|Object} channel
     * @returns {ChatSocket}
     */
    this.getChatSocket = function (channel) {
        return OpenChatSockets[Utils.cleanChannelToken(channel)];
    };

    /**
     * @param {String|Object} channel
     * @returns {Number|Null}
     */
    this.getViewerCount = function (channel) {
        var chatSocket = this.getChatSocket(channel);
        if (chatSocket != null)
            return chatSocket.viewers;
        return null;
    };

    /**
     * @param {String|Object} channel
     * @returns {Number|Null}
     */
    this.getChatterCount = function (channel) {
        var chatSocket = this.getChatSocket(channel);
        if (chatSocket != null)
            return chatSocket.chatters;
        return null;
    };

    /**
     * @param {String|Channel} channel
     * @returns {Object[]|Null}
     */
    this.getUsers = function (channel) {
        var chatSocket = this.getChatSocket(channel);
        if (chatSocket != null)
            return chatSocket.users;
        return null;
    };

    /**
     * @param {String|Channel} channel
     * @param {Number|User} user
     * @returns {String|Null}
     */
    this.getRoles = function (channel, user) {
        if (!user) user = TheUser;
        var chatSocket = this.getChatSocket(channel);
        if (chatSocket != null)
            return chatSocket.users[Utils.cleanUserId(user)].roles;
        return null;
    };

    /**
     * @param {String|Object} channel
     * @param {String} message
     */
    this.sendMessage = function (channel, message) {
        var chatSocket = this.getChatSocket(channel);
        if (chatSocket != null) {
            message = message.split('@viewers').join(this.getViewerCount(channel).toString());
            message = message.split('@chatters').join(this.getChatterCount(channel).toString());

            chatSocket.sendMessage(message);
        }
    };

    this.getAllChannels = function () {
        var channels = [];

        for (var i in OpenChatSockets) {
            if (!OpenChatSockets.hasOwnProperty(i)) continue;
            if (OpenChatSockets[i] != null) {
                channels.push(i);
            }
        }

        return channels;
    };

    /*
     TODO: Uncomment this when costreams is supported (and add the rest of the methods for it)
     this.requestCostream = function(otherChannels) {
     var channels = [];

     for (var i in otherChannels) {
     if (!otherChannels.hasOwnProperty(i)) continue;
     channels.push(typeof otherChannels[i] == 'object' ? otherChannels[i].id : otherChannels[i]);
     }

     APIRequest('post', {
     from: TheUser.channel.id,
     to: channels
     }, 'channels/costreams', {}, function(response) {
     Globals.logger.info(response);
     });
     };
     */

    Login(config.username, config.password, config.auth, function (code, response) {
        if (code == 200) {
            Globals.logger.info('Logged in as ' + config.username);
            that.emit('login:success');
            OnLoggedIn(response);
            return;
        }

        Globals.logger.warn('Error logging in: ' + JSON.stringify(response));

        if (code == 401) {
            that.emit('login:failed', response.error, response);
            that.emit('login:failed:' + response.error);
        } else if (code == 492) {
            that.emit('login:failed', 'rate_limit', response);
            that.emit('login:failed:rate_limit');
        } else {
            that.emit('login:failed', 'unknown', response);
            that.emit('login:failed:unknown');
        }
    });

    return this;
};

util.inherits(NodeBeam, EventEmitter);

exports.Connect = function (config) {
    return new NodeBeam(config);
};

exports.Utils = Utils;

/**
 * @type {*|function(): APIRequester|exports}
 */
exports.APIRequester = APIRequester;

exports.LiveLoading = LiveLoading;

exports.Channel = Channel;

exports.User = User;
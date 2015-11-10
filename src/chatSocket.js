var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var WebSocket = require('ws');
var ChatLogger = require('log4js').getLogger('[Chat]');

var Globals = require('./globals');
var User = require('./user');

/**
 * @param {NodeBeam} nodeBeam
 * @param {User} user
 * @param {Channel} channel
 * @constructor
 */
var ChatSocket = function (nodeBeam, user, channel) {
    var client;
    var that = this;
    var messageId = 1;
    var reconnecting = false;
    var closing = false;

    var APIRequest = require('./apiRequester')(user.username);

    this.slowchat = 0.5;
    this.viewers = 0;
    this.chatters = 0;
    this.users = [];
    this.queue = [];
    this.lastMessage = -1;
    this.chatTimeout = null;

    this.sendMessage = function (message) {
        if (this.lastMessage < Date.now() - this.slowchat) {
            this.lastMessage = Date.now();
            client.send(JSON.stringify({
                type: 'method',
                method: 'msg',
                arguments: [
                    message
                ],
                id: messageId++
            }));
        } else {
            this.queue.push(message);
        }

        if (this.queue.length > 0) {
            if (this.chatTimeout == null) {
                this.chatTimeout = setTimeout(function () {
                    that.chatTimeout = null;
                    that.sendMessage(that.queue.shift());
                }, this.slowchat);
            }
        }
    };

    //noinspection JSUnusedGlobalSymbols
    this.clearChat = function (callback) {
        APIRequest('delete', null, 'chats/' + channel.id + '/message', function (code) {
            if (callback != null && typeof callback == 'function') {
                callback(code == 200);
            }
        });
    };

    //noinspection JSUnusedGlobalSymbols
    this.startGiveaway = function () {
        client.send(JSON.stringify({
            type: 'method',
            method: 'giveaway:start',
            arguments: [],
            id: messageId++
        }));
    };

    //noinspection JSUnusedGlobalSymbols
    this.modUser = function (user, callback) {
        APIRequest('patch', {
            add: [
                'Mod'
            ]
        }, 'channels/' + channel.id + '/users/' + user, function (code) {
            if (callback != null && typeof callback == 'function') {
                callback(code == 200);
            }
        });
    };

    //noinspection JSUnusedGlobalSymbols
    this.unmodUser = function (user, callback) {
        APIRequest('patch', {
            remove: [
                'Mod'
            ]
        }, 'channels/' + channel.id + '/users/' + user, function (code) {
            if (callback != null && typeof callback == 'function') {
                callback(code == 200);
            }
        });
    };

    //noinspection JSUnusedGlobalSymbols
    this.banUser = function (user, callback) {
        APIRequest('patch', {
            add: [
                'Banned'
            ]
        }, 'channels/' + channel.id + '/users/' + user, function (code) {
            if (callback != null && typeof callback == 'function') {
                callback(code == 200);
            }
        });
    };

    //noinspection JSUnusedGlobalSymbols
    this.unbanUser = function (user, callback) {
        APIRequest('patch', {
            remove: [
                'Banned'
            ]
        }, 'channels/' + channel.id + '/users/' + user, function (code) {
            if (callback != null && typeof callback == 'function') {
                callback(code == 200);
            }
        });
    };

    function makeUserObj(data) {
        for (var i in that.users) {
            if (!that.users.hasOwnProperty(i)) continue;

            if (that.users[i].id == data.id) {
                return that.users[i];
            }
        }

        var user = {
            id: data.id,
            username: data.username,
            roles: data.roles,
            messages: []
        };

        that.users.push(user);

        return user;
    }

    function getUserById(userId) {
        for (var i in that.users) {
            if (!that.users.hasOwnProperty(i)) continue;

            if (that.users[i].id == userId) {
                return that.users[i];
            }
        }

        return null;
    }

    /**
     * @param {{
     *      event: String,
     *      data: {
     *          viewers: Number,
     *          chatters: Number,
     *          user: User
     *          roles: Array,
     *          username: String,
     *          id: Number,
     *          user_id: Number,
     *          user_name: String,
     *          user_roles: Array,
     *          message: {
     *              type: String,
     *              data: String,
     *              text: String
     *          }[]
     *      }
     * }} eventMessage
     */
    function handleEvent(eventMessage) {
        var i, user;
        try {
            switch (eventMessage.event) {
                case 'Stats':
                    that.viewers = eventMessage.data.viewers ? eventMessage.data.viewers : 0;
                    that.chatters = eventMessage.data.chatters;
                    return;
                case 'PollStart':
                    that.emit('poll:start', eventMessage.data);
                    break;
                case 'PollEnd':
                    that.emit('poll:end', eventMessage.data);
                    break;
                case 'UserJoin':
                    if (eventMessage.data.id != 'anon') {
                        that.emit('user:join', makeUserObj(eventMessage.data));
                    }
                    break;
                case 'UserLeave':
                    if (eventMessage.data.id != 'anon') {
                        for (i in that.users) {
                            if (!that.users.hasOwnProperty(i)) continue;

                            if (that.users[i].id == eventMessage.data.id) {
                                that.users.splice(i, 1);
                            }
                        }

                        that.emit('user:leave', eventMessage.data);
                    }
                    break;
                case 'UserUpdate':
                    user = getUserById(eventMessage.data.user);

                    if (user == null) {
                        user = makeUserObj(eventMessage.data);
                    }

                    user.roles = eventMessage.data.roles;
                    user.username = eventMessage.data.username;

                    that.emit('user:update', eventMessage.data);
                    break;
                case 'DeleteMessage':
                    that.emit('chat:delete', eventMessage.data.id);
                    break;
                case 'ClearMessages':
                    that.emit('chat:clear');
                    break;
                case 'ChatMessage':
                    user = getUserById(eventMessage.data.user_id);

                    if (user == null) {
                        user = makeUserObj({
                            id: eventMessage.data.user_id,
                            username: eventMessage.data.user_name,
                            roles: eventMessage.data.user_roles
                        });
                    } else if (user.roles != eventMessage.data.user_roles) {
                        user.roles = eventMessage.data.user_roles;
                        that.emit('user:update', user);
                    }

                    eventMessage.data.cleanMessage = '';
                    eventMessage.data.emotes = [];

                    eventMessage.data.message.message.forEach(function (messagePart) {
                        if (messagePart.type == 'text') {
                            eventMessage.data.cleanMessage += messagePart.data;
                        } else {
                            if (messagePart.type == 'emoticon') {
                                eventMessage.data.emotes.push(messagePart);
                            }
                            eventMessage.data.cleanMessage += messagePart.text;
                        }
                    });

                    user.messages.push(eventMessage.data.cleanMessage);
                    if (user.messages.length > 100) {
                        user.messages.splice(0, user.messages.length - 100);
                    }

                    that.emit('chat:message', channel, user, eventMessage.data);
                    break;
                case 'ChannelOptions':
                    // FIXME: This event is no longer used by Beam (outcommented is implemented another way)
                    if (eventMessage.data.name != null) {
                        //that.title = eventMessage.data.name;
                        that.description = eventMessage.data.body;
                    } else {
                        that.slowchat = eventMessage.data.slowchat;
                    }
                    that.emit('channel:update', {
                        title: that.title,
                        description: that.description,
                        slowchat: that.slowchat
                    });
                    break;
                case 'Error':
                    if (eventMessage.data.type == 'ENOTJSON') {
                        //Ignore
                    } else {
                        ChatLogger.warn('[' + channel.token + '] Unknown error event', eventMessage.event, eventMessage.data);
                    }
                    break;
                default:
                    ChatLogger.warn('[' + channel.token + '] Unknown event', eventMessage.event, eventMessage.data);
                    break;
            }
        } catch (e) {
            ChatLogger.error(e);
            ChatLogger.info(e.stack);
        }
        if (fs.existsSync('events')) {
            fs.writeFileSync('events/' + eventMessage.event + '.json', JSON.stringify(eventMessage, null, 4));
        }
    }

    function getAuthKey() {
        APIRequest('get', {}, 'chats/' + channel.id, function (code, response) {
            if (code == 200) {
                that.authkey = response.authkey;
                that.endpoints = response.endpoints;
                doConnect();
            } else {
                setTimeout(function () {
                    getAuthKey();
                }, 1000);
            }
        });
    }

    function doConnect() {
        var endpoint = that.endpoints[Math.floor(Math.random() * that.endpoints.length)];

        messageId = 1;

        client = new WebSocket(endpoint, {
            headers: Globals.headers
        });

        client.on('open', function () {
            client.send(JSON.stringify({
                type: 'method',
                method: 'auth',
                arguments: [
                    channel.id,
                    user.id,
                    that.authkey
                ],
                id: messageId++
            }));

            ChatLogger.info('[' + channel.token + '] Connected');
        });

        client.on('error', function (error) {
            if (that.interval != null) {
                clearInterval(that.interval);
                that.interval = null;
            }

            ChatLogger.info('[' + channel.token + '] ' + error.toString());

            client.close();
        });

        client.on('close', function (e) {
            if (that.interval != null) {
                clearInterval(that.interval);
                that.interval = null;
            }

            if (!closing) {
                that.emit('disconnect', e);
                ChatLogger.info('[' + channel.token + '] Connection Closed: ' + e);
                reconnecting = true;
                getAuthKey();
            }
        });

        client.on('message', function (data) {
            var message;

            try {
                message = JSON.parse(data);
            } catch (e) {
                ChatLogger.warn('[' + channel.token + '] Error parsing message: ' + e);
                return;
            }

            switch (message.type) {
                case 'reply':
                    if (!message.error) {
                        if (message.data.authenticated) {
                            ChatLogger.info('[' + channel.token + '] Authenticated');
                            that.interval = setInterval(function () {
                                client.send("");
                            }, 3e4);
                            that.role = message.data.role;
                            that.emit('channel:join', channel, reconnecting);
                            APIRequest('get', {}, 'chats/' + channel.id + '/users', function (code, users) {
                                if (code == 200) {
                                    for (var i in users) {
                                        if (!users.hasOwnProperty(i)) continue;
                                        that.emit('user:join', makeUserObj({
                                            id: users[i].userId,
                                            username: users[i].userName,
                                            roles: users[i].userRoles
                                        }), true);
                                    }
                                }
                            });
                            return;
                        }

                        //Ignore message sent confirmation replies
                        if (message.data == 'Message sent.') {
                            return;
                        }
                    }
                    ChatLogger.warn('[' + channel.token + '] Unhandled reply: ' + (typeof message == 'string' ? message : JSON.stringify(message)));
                    break;
                case 'event':
                    handleEvent(message);
                    break;
            }
        });
    }

    getAuthKey();

    this.close = function () {
        closing = true;
        client.close();
        this.emit('channel:leave', channel);
    };

    return this;
};

util.inherits(ChatSocket, EventEmitter);

/**
 * @param {NodeBeam} nodeBeam
 * @param {User} user
 * @param {Channel} channel
 * @returns {ChatSocket}
 */
exports.Connect = function (nodeBeam, user, channel) {
    return new ChatSocket(nodeBeam, user, channel);
};

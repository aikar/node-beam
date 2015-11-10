var socketIOClient = require('socket.io-client');
var sailsIOClient = require('sails.io.js');

var LiveLoading = function () {
    var that = this;

    this.subscribedEvents = [];

    function onSocketError(error) {
        console.log('[Socket] Error', error);
    }

    function onSocketDisconnect(code) {
        console.log('[Socket] Closed with close code', code);
    }

    /**
     * @param {String} slug
     * @param {Function} eventCallback
     * @param {Function} [callback]
     */
    this.subscribe = function (slug, eventCallback, callback) {
        for (var i in this.subscribedEvents) {
            if (!this.subscribedEvents.hasOwnProperty(i)) continue;

            if (this.subscribedEvents[i].slug == slug) {
                if (callback != null && typeof callback == 'function') {
                    callback(false, -1);
                }
                return;
            }
        }

        this.socket.put('/api/v1/live', {
            slug: slug
        }, function (body, response) {
            if (response.statusCode == 200) {
                var m = slug.match(/^channel:([0-9]+):status$/);
                if (m != null) {
                    that.socket.on('chat:' + m[1] + ':StartStreaming', eventCallback);
                    that.socket.on('chat:' + m[1] + ':StopStreaming', eventCallback);
                } else {
                    that.socket.on(slug, eventCallback);
                }

                that.subscribedEvents.push({
                    slug: slug,
                    callback: eventCallback
                });

                if (callback != null && typeof callback == 'function') {
                    callback(true, response.statusCode);
                }
            } else {
                if (callback != null && typeof callback == 'function') {
                    callback(false, response.statusCode);
                }
            }
        });
    };

    /**
     * @param {String} slug
     * @param {Function} [callback]
     */
    this.unsubscribe = function (slug, callback) {
        for (var i in this.subscribedEvents) {
            if (!this.subscribedEvents.hasOwnProperty(i)) continue;

            if (this.subscribedEvents[i].slug == slug) {
                this.socket.delete('/api/v1/live', {
                    slug: slug
                }, function (body, response) {
                    if (response.statusCode == 200) {
                        var m = slug.match(/^channel:([0-9]+):status$/);
                        if (m != null) {
                            that.socket.removeAllListeners('chat:' + m[1] + ':StartStreaming');
                            that.socket.removeAllListeners('chat:' + m[1] + ':StopStreaming');
                        } else {
                            that.socket.removeAllListeners(slug);
                        }

                        for (var i in that.subscribedEvents) {
                            if (!that.subscribedEvents.hasOwnProperty(i)) continue;

                            if (that.subscribedEvents[i].slug == slug) {
                                that.subscribedEvents.splice(i, 1);
                                return;
                            }
                        }

                        if (callback != null && typeof callback == 'function') {
                            callback(true, response.statusCode);
                        }
                    } else {
                        if (callback != null && typeof callback == 'function') {
                            callback(false, response.statusCode);
                        }
                    }
                });
                return;
            }
        }

        if (callback != null && typeof callback == 'function') {
            callback(false, -1);
        }
    };

    /**
     * @type {{sails: Object, socket: {get: Function, post: Function, put: Function, delete: Function}}|exports}
     */
    var io = sailsIOClient(socketIOClient);

    io.sails.autoConnect = false;
    io.sails.url = 'wss://beam.pro';
    io.sails.transports = ['websocket'];
    io.sails.useCORSRouteToGetCookie = false;

    this.socket = io.sails.connect();
    this.socket.forceNew = true;

    this.socket.on('connect', function () {
        var events = that.subscribedEvents;

        that.subscribedEvents = [];

        // Resubscribe to all events upon reconnect
        for (var i in events) {
            if (!events.hasOwnProperty(i)) continue;

            (function (event) {
                that.socket.removeAllListeners(event.slug);

                that.subscribe(event.slug, event.callback, function (success, code) {
                    if (success)
                        console.log('Resubscribed to ' + event.slug);
                    else {
                        console.log('Error while resubscribing to ' + event.slug, code);
                    }
                });
            })(events[i]);
        }
    });

    this.socket.on('error', onSocketError);
    this.socket.on('disconnect', onSocketDisconnect);

    return this;
};

module.exports = function () {
    return new LiveLoading();
};
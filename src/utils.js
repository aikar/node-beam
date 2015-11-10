var util = require('util');
var request = require('request');

//noinspection JSUnusedGlobalSymbols
var Utils = {
    cleanChannelToken: function (channel) {
        return (typeof channel == 'string' ? channel : channel.token).toLowerCase();
    },

    /**
     * Clean a username.
     * In lowercase
     *
     * @param {User|String} user
     * @returns {string}
     */
    cleanUserName: function (user) {
        return (typeof user == 'string' ? user : user.username).toLowerCase().split('@').join('');
    },

    /**
     * Get userID
     *
     * @param {User|Number} user
     * @returns {Number}
     */
    cleanUserId: function (user) {
        return typeof user == 'object' ? user.id : user;
    },

    /**
     * Clean a command.
     * In lowercase
     *
     * @param {String} command
     * @returns {string}
     */
    cleanCommand: function (command) {
        if (typeof command == 'string')
            return (command.substr(0, 1) == '!' ? command.substr(1) : command).toLowerCase();
        return '';
    },

    /**
     * Percentage of a string that is symbol.
     *
     * @see Documentation: http://www.twitch-irc.com/docs/twitch-irc/Utils/Symbols
     * @author Schmoopiie
     *
     * @param {String} string
     * @returns {Number} 0-1
     */
    symbols: function (string) {
        var count = 0;
        for (var i = 0; i < string.length; i++) {
            var charCode = string.substring(i, i + 1).charCodeAt(0);
            if ((charCode <= 30 || charCode >= 127) || charCode === 65533) {
                count++;
            }
        }
        return Math.ceil((count / string.length) * 100) / 100;
    },

    /**
     * Percentage of a string that is uppercase.
     *
     * Documentation: https://github.com/Schmoopiie/twitch-irc/wiki/Utils#uppercase
     * @author Schmoopiie
     *
     * @param {String} string
     * @returns {Number} 0-1
     */
    uppercase: function (string) {
        var chars = string.length;
        var u_let = string.match(/[A-Z]/g);
        if (u_let !== null) {
            return (u_let.length / chars);
        }
        return 0;
    },

    /**
     * Check if a string contains another string
     *
     * @param {String} string
     * @param {String} text
     * @returns {Boolean}
     */
    stringContains: function (string, text) {
        if (typeof string === 'string' && typeof text === 'string')
            return string.indexOf(text) > -1;
        return false;
    },

    /**
     * Check if a string contains another string (ignores case)
     *
     * @param {String} string
     * @param {String} text
     * @returns {Boolean}
     */
    stringContainsIgnoreCase: function (string, text) {
        if (typeof string === 'string' && typeof text === 'string')
            return this.stringContains(string.toLowerCase(), text.toLowerCase());
        return false;
    },

    /**
     * Check if a string contains regex
     *
     * @param {String} string
     * @param {RegExp} regex
     * @returns {Boolean}
     */
    stringContainsRegex: function (string, regex) {
        if (regex == null)
            return false;
        return regex.test(string);
    },

    /**
     * Check if a string contains word
     *
     * @param {String} string
     * @param {String} word
     * @returns {Boolean}
     */
    stringContainsWord: function (string, word) {
        return (' ' + string + ' ').indexOf(' ' + word + ' ') > -1;
    },

    /**
     * Check if a string contains word (ignores case)
     *
     * @param {String} string
     * @param {String} word
     * @returns {Boolean}
     */
    stringContainsWordIgnoreCase: function (string, word) {
        if (typeof string === 'string' && typeof word === 'string')
            return this.stringContainsWord(string.toLowerCase(), word.toLowerCase());
    },

    /**
     * Check if a string ends with a string.
     *
     * @param {String} a String
     * @param {String|String[]} b String or strings it will check
     * @returns {Boolean}
     */
    stringEndsWith: function (a, b) {
        if (typeof a === 'string') {
            if (typeof b === 'string' && a.length >= b.length) {
                return a.lastIndexOf(b) === a.length - b.length;
            } else if (util.isArray(b)) {
                for (var c in b) {
                    if (!b.hasOwnProperty(c)) continue;
                    var d = b[c];
                    if (typeof d === 'string' && this.stringEndsWith(a, d)) {
                        return true;
                    }
                }
            }
        } else if (util.isArray(a) && typeof b === 'string') {
            this.stringEndsWith(b, a);
        }
        return false;
    },

    /**
     * Check if a string ends with a string.
     * Ignores case.
     *
     * @param {String} a String
     * @param {String|String[]} b String or strings it will check
     * @returns {Boolean}
     */
    stringEndsWithIgnoreCase: function (a, b) {
        if (typeof a === 'string') {
            if (typeof b === 'string' && a.length >= b.length) {
                return this.stringEndsWith(a.toLowerCase(), b.toLowerCase());
            } else if (util.isArray(b)) {
                for (var c in b) {
                    if (!b.hasOwnProperty(c)) continue;
                    var d = b[c];
                    if (typeof d === 'string' && this.stringEndsWithIgnoreCase(a, d)) {
                        return true;
                    }
                }
            }
        } else if (util.isArray(a) && typeof b === 'string') {
            this.stringEndsWithIgnoreCase(b, a);
        }
        return false;
    },

    /**
     * Check if a string equals another string.
     * Ignores case.
     *
     * @param {String} a String
     * @param {String|String[]} b String or strings it will check
     * @returns {Boolean}
     */
    stringEqualsIgnoreCase: function (a, b) {
        if (typeof a === 'string') {
            if (typeof b === 'string' && a.toLowerCase() === b.toLowerCase()) {
                return true;
            } else if (util.isArray(b)) {
                for (var c in b) {
                    if (!b.hasOwnProperty(c)) continue;
                    var d = b[c];
                    if (typeof d === 'string' && this.stringEqualsIgnoreCase(a, d)) {
                        return true;
                    }
                }
            }
        } else if (util.isArray(a) && typeof b === 'string') {
            this.stringEqualsIgnoreCase(b, a);
        }
        return false;
    },

    /**
     * Check if a string equals another string.
     * Ignores case and trims the string before comparing.
     *
     * @param {String} a String
     * @param {String|String[]} b String or strings it will check
     * @returns {Boolean}
     */
    stringEqualsIgnoreCaseTrim: function (a, b) {
        if (typeof a === 'string') {
            if (typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase()) {
                return true;
            } else if (util.isArray(b)) {
                for (var c in b) {
                    if (!b.hasOwnProperty(c)) continue;
                    var d = b[c];
                    if (typeof d === 'string' && this.stringEqualsIgnoreCaseTrim(a, d)) {
                        return true;
                    }
                }
            }
        } else if (util.isArray(a) && typeof b === 'string') {
            this.stringEqualsIgnoreCaseTrim(b, a);
        }
        return false;
    },

    /**
     * Check if a string starts with a string.
     *
     * @param {String} a String
     * @param {String|String[]} b String or strings it will check
     * @returns {Boolean}
     */
    stringStartsWith: function (a, b) {
        if (typeof a === 'string') {
            if (typeof b === 'string' && a.length >= b.length) {
                return a.indexOf(b) === 0;
            } else if (util.isArray(b)) {
                for (var c in b) {
                    if (!b.hasOwnProperty(c)) continue;
                    var d = b[c];
                    if (typeof d === 'string' && this.stringStartsWith(a, d)) {
                        return true;
                    }
                }
            }
        } else if (util.isArray(a) && typeof b === 'string') {
            this.stringStartsWith(b, a);
        }
        return false;
    },

    /**
     * Check if a string starts with a string.
     * Ignores case.
     *
     * @param {String} a String
     * @param {String|String[]} b String or strings it will check
     * @returns {Boolean}
     */
    stringStartsWithIgnoreCase: function (a, b) {
        if (typeof a === 'string') {
            if (typeof b === 'string' && a.length >= b.length) {
                return this.stringStartsWith(a.toLowerCase(), b.toLowerCase());
            } else if (util.isArray(b)) {
                for (var c in b) {
                    if (!b.hasOwnProperty(c)) continue;
                    var d = b[c];
                    if (typeof d === 'string' && this.stringStartsWithIgnoreCase(a, d)) {
                        return true;
                    }
                }
            }
        } else if (util.isArray(a) && typeof b === 'string') {
            this.stringStartsWithIgnoreCase(b, a);
        }
        return false;
    },

    /**
     * Select from an object by a selector.
     *
     * Example:
     * var obj = {
     *     protection: {
     *         links: {
     *             enabled: true
     *         }
     *     }
     * };
     * objectSelector(obj, 'protection.links.enabled', false); // returns true
     * objectSelector(obj, 'protection.links.limit', 8); // returns 8
     *
     * @param {Object} obj Object to select from
     * @param {String} selector Dot separated selector
     * @param {*} defaultValue The default value if not found
     * @returns {*} Value if found; otherwise defaultValue
     */
    objectSelector: function (obj, selector, defaultValue) {
        if (selector == null)
            return defaultValue;

        var a = obj;

        var key = selector.split('.');

        for (var i in key) {
            if (!key.hasOwnProperty(i)) continue;
            if (a[key[i]] == null) {
                return defaultValue;
            }
            a = a[key[i]];
        }

        return a;
    },

    /**
     * Remove all HTML tags from a string
     *
     * @param input
     * @returns {string}
     */
    cleanHTMLMessage: function (input) {
        if (input == null) return '';
        var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
        return input.replace(tags, '');
    },
    getJSON: function (url, callback) {
        var opts = {
            url: url,
            encoding: 'utf8',
            json: true
        };
        request(opts, function (err, res, body) {
            callback(res ? res.statusCode : -1, body);
        });
    },
    toNumber: function (text) {
        return !isNaN(parseInt(text, 10)) && isFinite(text) ? ~~text : null;
    }
};

module.exports = Utils;
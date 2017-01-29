# node-beam

[![Greenkeeper badge](https://badges.greenkeeper.io/aikar/node-beam.svg)](https://greenkeeper.io/)
Node.JS package for Beam.pro

**Note** This is an alpha version - things can, and will, change.

**IFDevelopment is not associated with Beam in any way shape or form, we just develop apps/extensions for the community**

## Example
```javascript
var connection = BeamAPI.Connect({
    username: 'MyUsername',
    password: 'MySecretPassword',
    auth: null, // 2 Factor Authentication code as string, or null if not used
    settings: {
        autoJoinOwnChannel: true
    }
});

connection.on('channel:join', function (channel, reconnect) {
    console.log(reconnect ? 'Rejoined' : 'Joined', channel.token);
});

connection.on('user:join', function (channel, user, initial) {
    console.log(user.username, 'joined', channel.token, initial ? '(Upon joined the channel)' : '(After joining the channel)');
});

connection.on('user:leave', function (channel, user) {
    console.log(user.username, 'left', channel.token);
});

connection.on('chat:message', function (channel, user, message) {
    console.log('[' + channel.token + '] ' + user.username + ' - ' + message);
});

connection.getChannel('TATDK', function (channelData) {
    if (channelData != null) {
        connection.joinChannel(channelData);
    } else {
        console.log('Couldn\'t find channel');
    }
});
```

## License
This package is licensed under the [MIT License](http://git.ifdevelopment.net/IFDevelopment/node-beam/blob/master/LICENSE.md).
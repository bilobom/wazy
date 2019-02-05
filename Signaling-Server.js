
// to use this signaling-server.js file:
// require('./Signaling-Server.js')(socketio_object); --- pass socket.io object
// require('./Signaling-Server.js')(nodejs_app_object); --- pass node.js "app" object

// stores all sockets, user-ids, extra-data and connected sockets
// you can check presence as following:
// var isRoomExist = listOfRTCUsers['room-id'] != null;
//

var User = require('./models/usersModel');
var Company = require('./models/companyModel');

function checkingUserAccess(username , accessToken , callback ) {
  console.log("SS : checkingUserAccess");
  callback = callback || function(){};
  User.getUserByUsername(username, function (err, user) {
    if(err) { console.log("error=="+err);  return;}

    var reason = '';
    var allowed = true;

    if ( !user || user === undefined || user === null) {
      reason = username + ' Non Enregistred ';
      callback(false , reason);
      return;
    }

    if( !user.token || user.token == null || user.token == undefined || user.token !== accessToken ){
      reason = 'Access Token Non Valide';
      callback(false , reason);
      return;
    }

    if( !user.SCN || user.SCN == null || user.SCN == undefined ){
      reason = 'No Service Contract Number ';
      callback(false , reason);
      return;
    }

    Company.getCompanyBySCN(user.SCN,function(err , company){
      if(err) { console.log("error=="+err);  return;}

      if ( !company || company === undefined || company === null) {
        reason = 'Service Contract Number Not Exist';
        callback(false , reason);
        return;
      }

      var today = new Date();
      if(company.date_fin.getTime() < today ){
        reason = 'Contract is dead';
        callback(false , reason);
        return;
      }
    });

    callback(true , reason);
  });
}

function newUserOnLineNotif(username) {
  console.log("SS : newUserOnLineNotif");
  User.getUserByUsername(username, function (err, user) {
    user.contacts.forEach(function(contact){
      if(listOfUsers[contact]){
        listOfUsers[contact].sockets.forEach(function(ContactSocket) {
          ContactSocket.emit('UsersOnLine',username);
        });
      }
    });
  });
}

function sendListContacts(userSoket){
  console.log("SS : sendListContacts");
  User.getUserByUsername(userSoket.userid, function (err, user) {
    contactsOnLine = [];
    user.contacts.forEach(function(contact){
      if(onLineUsers.includes(contact)){
        contactsOnLine.push(contact);
      }
    });

    console.log("SS : ListOfContacts ---> ");
    console.log(user.contacts+" --- online : "+contactsOnLine);

    userSoket.emit('ListContacts',user.contacts);
    userSoket.emit('ListContactsOnLine',contactsOnLine);
  });
}

var listOfRTCUsers = {}; //in RTC Session
var listOfUsers = {}; // simple session
var onLineUsers = [];
var mutex = false ; // TODO


var shiftedModerationControls = {};

// for scalable-broadcast demos
var ScalableBroadcast;



module.exports = exports = function(app, socketCallback) {
    socketCallback = socketCallback || function() {};

    if (!!app.listen) {
        var io = require('socket.io');

        try {
            // use latest socket.io
            io = io(app);
            io.on('connection', onConnection);
        } catch (e) {
            // otherwise fallback
            io = io.listen(app, {
                log: false,
                origins: '*:*'
            });
            io.set('transports', [
                'websocket',
                'xhr-polling',
                'jsonp-polling'
            ]);

            io.sockets.on('connection', onConnection);
        }
    } else {
        onConnection(app);
    }


    // to secure your socket.io usage: (via: docs/tips-tricks.md)
    // io.set('origins', 'https://rgridserve.herokuapp.com:*');
    /*
    if (socket.handshake.headers.origin == 'https://rgridserve.herokuapp.com') {
    console.log(socket.handshake.headers.origin + ' Allowed.');
    } else {
    console.log(socket.handshake.headers.origin + ' Not Allowed.');
    socket.disconnect();
    return;
    }
    */
    //@BILAL the RTCMultiCnt have a problem with userid, where userid=roomid ,
    // for this i need to change userid to username for both RTCSocket and UserSocket
    // parameters += '&username=' + userid;
    function onConnection(socket) {

        var params = socket.handshake.query;
        // @BIlAL here instead of userid we change it to username OK thankYou !
        checkingUserAccess(params.username , params.token , function(allowed , reason ){
          if(!allowed){
            socket.emit('accessRejected',reason);
            return;
          }
          if(params.soketType == 'socket'){
            // From Users.js (Client)
            simpleSocket(socket);
          }else{
            // params.soketType ==  RTCSocket
            // From RTCMultiConnection.js (Client)
            onRTCconnectoin(socket);
          }
        });
    }


    function simpleSocket(newSocket){
      console.log(" SS : simpleSocket ");
      appendUser(newSocket);
      var params = newSocket.handshake.query;
      var userid = params.userid;
      newSocket.userid = userid ;


      if(!onLineUsers.includes(params.userid)){
        onLineUsers.push(params.userid);
      }

      console.log( " Connect ------------------- > "+ userid + " -------------------------- > "+listOfUsers[userid].sockets.length);

      sendListContacts(newSocket);
      newUserOnLineNotif(userid);

      newSocket.on('openDataChannel',function(caller , recever){
        if(!!listOfUsers[recever] && !!listOfUsers[recever].sockets && listOfUsers[recever].sockets.length > 0 ){
          recever = listOfUsers[recever];
          if(recever.sockets){
                recever.sockets.forEach(function(ReceverSocket) {
                  if(ReceverSocket) ReceverSocket.emit('wantToChat',caller);
                });
             }
        }
        else {
          //if(!!listOfUsers[caller] && !!listOfUsers[caller].sockets && listOfUsers[caller].sockets.length > 0 ){
            //caller = listOfUsers[caller];
            if(caller.sokets){
               caller.sokets.forEach(function(callerSocket){
                    if(callerSocket) callerSocket.emit('userOffLine',recever);
                });
               }

          //}
          console.log('No '+recever+' Socket to Call him !!!');
        }
      });

      newSocket.on('chatResponse',function(caller,recever,accepted,roomid){
        if(!!listOfUsers[caller] && listOfUsers[caller].sockets){
          caller = listOfUsers[caller];
          // to prevent this error
          //peError: Cannot read property 'forEach' of undefined
          //a Socket.<anonymous> (/app/Signaling-Server.js:146:27)
          if(caller.sockets){
              caller.sockets.forEach(function(callerSocket) {
                if(callerSocket) callerSocket.emit('chatReply',recever,accepted,roomid);
              });
          }
        }
      });

      newSocket.on('call',function(caller , recever , video){
        if(!!listOfUsers[recever] && !!listOfUsers[recever].sockets && listOfUsers[recever].sockets.length > 0 ){
          recever = listOfUsers[recever];
          if(recever.sockets){
               recever.sockets.forEach(function(ReceverSocket) {
                  if(ReceverSocket) ReceverSocket.emit('inCammingCall',caller,video);
                });
             }

        }
        else {
          if(!!listOfUsers[caller] && !!listOfUsers[caller].sockets && listOfUsers[caller].sockets.length > 0 ){
            caller = listOfUsers[caller];
            if(caller.sokets){
               caller.sokets.forEach(function(callerSocket){
                    callerSocket.emit('userOffLine',recever);
                });
               }

          }
          console.log('No '+recever+' Socket to Call him !!!');
        }
      });

      newSocket.on('setResponse',function(caller,recever,accepted,roomid){
        if(!!listOfUsers[caller] && listOfUsers[caller].sockets){
          caller = listOfUsers[caller];
          // to prevent this error
          //peError: Cannot read property 'forEach' of undefined
          //a Socket.<anonymous> (/app/Signaling-Server.js:146:27)
          if(caller.sockets){
              caller.sockets.forEach(function(callerSocket) {
                if(callerSocket) callerSocket.emit('getResponse',recever,accepted,roomid);
              });
          }
        }
      });

      newSocket.on('disconnect', function() {
        if(!!listOfUsers[newSocket.userid] &&  !!listOfUsers[newSocket.userid].sockets){
          console.log( "disconnect ------------------- > "+ newSocket.userid + " -------------------------- > "+listOfUsers[userid].sockets.length);
          if(listOfUsers[newSocket.userid].sockets.length <= 1) {
            listOfUsers[newSocket.userid].sockets = [];
            onLineUsers = onLineUsers.filter(word => word !== newSocket.userid );
          }else{
            listOfUsers[newSocket.userid].sockets = listOfUsers[newSocket.userid].sockets.filter(e => e.id != newSocket.id );
          }
        }
        io.sockets.emit('UsersOnLine',onLineUsers,listOfUsers[newSocket.userid].sockets.length);

      });

      newSocket.on('cancelCall',(recever)=>{
        if(!!listOfUsers[recever] && !!listOfUsers[recever].sockets && listOfUsers[recever].sockets.length > 0 ){
          let recever2 = listOfUsers[recever];
          if(recever2.sockets){
            recever2.sockets.forEach(function(ReceverSocket) {
              if(ReceverSocket) ReceverSocket.emit('cancelCall',recever2);
            });
          }
        }
      });

    }


    // each user can open a Single Soket
    function appendUser(newSocket){
      var params = newSocket.handshake.query;
      var userid = params.userid;
      newSocket.userid = userid ;
      listOfUsers[userid] = {
        sockets : [newSocket]
      }
    }


    function onRTCconnectoin(socket) {

        var params = socket.handshake.query;
        var socketMessageEvent = params.msgEvent || 'RTCMultiConnection-Message';

        var sessionid = params.sessionid;
        var autoCloseEntireSession = params.autoCloseEntireSession;

        if (!!params.enableScalableBroadcast) {
            if (!ScalableBroadcast) {
                ScalableBroadcast = require('./Scalable-Broadcast.js');
            }
            ScalableBroadcast(socket, params.maxRelayLimitPerUser);
        }

        // temporarily disabled
        if (!!listOfRTCUsers[params.userid]) {
            params.dontUpdateUserId = true;

            var useridAlreadyTaken = params.userid;
            params.userid = (Math.random() * 1000).toString().replace('.', '');
            socket.emit('userid-already-taken', useridAlreadyTaken, params.userid);
        }

        socket.userid = params.userid;
        appendUserToRTCList(socket);

        if (autoCloseEntireSession == 'false' && Object.keys(listOfRTCUsers).length == 1) {
            socket.shiftModerationControlBeforeLeaving = true;
        }

        socket.on('shift-moderator-control-on-disconnect', function() {
            socket.shiftModerationControlBeforeLeaving = true;
        });

        socket.on('extra-data-updated', function(extra) {
            try {
                if (!listOfRTCUsers[socket.userid]) return;
                listOfRTCUsers[socket.userid].extra = extra;

                for (var user in listOfRTCUsers[socket.userid].connectedWith) {
                    listOfRTCUsers[user].socket.emit('extra-data-updated', socket.userid, extra);
                }
            } catch (e) {
                pushLogs('extra-data-updated', e);
            }
        });

        socket.on('get-remote-user-extra-data', function(remoteUserId, callback) {
            callback = callback || function() {};
            if (!remoteUserId || !listOfRTCUsers[remoteUserId]) {
                callback('remoteUserId (' + remoteUserId + ') does NOT exist.');
                return;
            }
            callback(listOfRTCUsers[remoteUserId].extra);
        });

        socket.on('become-a-public-moderator', function() {
            try {
                if (!listOfRTCUsers[socket.userid]) return;
                listOfRTCUsers[socket.userid].isPublic = true;
            } catch (e) {
                pushLogs('become-a-public-moderator', e);
            }
        });

        var dontDuplicateListeners = {};
        socket.on('set-custom-socket-event-listener', function(customEvent) {
            if (dontDuplicateListeners[customEvent]) return;
            dontDuplicateListeners[customEvent] = customEvent;

            socket.on(customEvent, function(message) {
                try {
                    socket.broadcast.emit(customEvent, message);
                } catch (e) {}
            });
        });

        socket.on('dont-make-me-moderator', function() {
            try {
                if (!listOfRTCUsers[socket.userid]) return;
                listOfRTCUsers[socket.userid].isPublic = false;
            } catch (e) {
                pushLogs('dont-make-me-moderator', e);
            }
        });

        socket.on('get-public-moderators', function(userIdStartsWith, callback) {
            try {
                userIdStartsWith = userIdStartsWith || '';
                var allPublicModerators = [];
                for (var moderatorId in listOfRTCUsers) {
                    if (listOfRTCUsers[moderatorId].isPublic && moderatorId.indexOf(userIdStartsWith) === 0 && moderatorId !== socket.userid) {
                        var moderator = listOfRTCUsers[moderatorId];
                        allPublicModerators.push({
                            userid: moderatorId,
                            extra: moderator.extra
                        });
                    }
                }

                callback(allPublicModerators);
            } catch (e) {
                pushLogs('get-public-moderators', e);
            }
        });

        socket.on('changed-uuid', function(newUserId, callback) {
            callback = callback || function() {};

            if (params.dontUpdateUserId) {
                delete params.dontUpdateUserId;
                return;
            }

            try {
                if (listOfRTCUsers[socket.userid] && listOfRTCUsers[socket.userid].socket.userid == socket.userid) {
                    if (newUserId === socket.userid) return;

                    var oldUserId = socket.userid;
                    listOfRTCUsers[newUserId] = listOfRTCUsers[oldUserId];
                    listOfRTCUsers[newUserId].socket.userid = socket.userid = newUserId;
                    delete listOfRTCUsers[oldUserId];

                    callback();
                    return;
                }

                socket.userid = newUserId;
                appendUserToRTCList(socket);

                callback();
            } catch (e) {
                pushLogs('changed-uuid', e);
            }
        });

        socket.on('set-password', function(password) {
            try {
                if (listOfRTCUsers[socket.userid]) {
                    listOfRTCUsers[socket.userid].password = password;
                }
            } catch (e) {
                pushLogs('set-password', e);
            }
        });

        socket.on('disconnect-with', function(remoteUserId, callback) {
            try {
                if (listOfRTCUsers[socket.userid] && listOfRTCUsers[socket.userid].connectedWith[remoteUserId]) {
                    delete listOfRTCUsers[socket.userid].connectedWith[remoteUserId];
                    socket.emit('user-disconnected', remoteUserId);
                }

                if (!listOfRTCUsers[remoteUserId]) return callback();

                if (listOfRTCUsers[remoteUserId].connectedWith[socket.userid]) {
                    delete listOfRTCUsers[remoteUserId].connectedWith[socket.userid];
                    listOfRTCUsers[remoteUserId].socket.emit('user-disconnected', socket.userid);
                }
                callback();
            } catch (e) {
                pushLogs('disconnect-with', e);
            }
        });

        socket.on('close-entire-session', function(callback) {
            try {
                var connectedWith = listOfRTCUsers[socket.userid].connectedWith;
                if(Object.keys(connectedWith)){
                   Object.keys(connectedWith).forEach(function(key) {
                        if (connectedWith[key] && connectedWith[key].emit) {
                            try {
                                connectedWith[key].emit('closed-entire-session', socket.userid, listOfRTCUsers[socket.userid].extra);
                            } catch (e) {}
                        }
                    });
                   }

                delete shiftedModerationControls[socket.userid];
                callback();
            } catch (e) {
                pushLogs('close-entire-session', e);
            }
        });

        socket.on('check-presence', function(userid, callback) {
            if (!listOfRTCUsers[userid]) {
                callback(false, userid, {});
            } else {
                callback(userid !== socket.userid, userid, listOfRTCUsers[userid].extra);
            }
        });

        function onMessageCallback(message) {
            try {
                if (!listOfRTCUsers[message.sender]) {
                    socket.emit('user-not-found', message.sender);
                    return;
                }

                if (!message.message.userLeft && !listOfRTCUsers[message.sender].connectedWith[message.remoteUserId] && !!listOfRTCUsers[message.remoteUserId]) {
                    listOfRTCUsers[message.sender].connectedWith[message.remoteUserId] = listOfRTCUsers[message.remoteUserId].socket;
                    listOfRTCUsers[message.sender].socket.emit('user-connected', message.remoteUserId);

                    if (!listOfRTCUsers[message.remoteUserId]) {
                        listOfRTCUsers[message.remoteUserId] = {
                            socket: null,
                            connectedWith: {},
                            isPublic: false,
                            extra: {},
                            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                        };
                    }

                    listOfRTCUsers[message.remoteUserId].connectedWith[message.sender] = socket;

                    if (listOfRTCUsers[message.remoteUserId].socket) {
                        listOfRTCUsers[message.remoteUserId].socket.emit('user-connected', message.sender);
                    }
                }

                if (listOfRTCUsers[message.sender].connectedWith[message.remoteUserId] && listOfRTCUsers[socket.userid]) {
                    message.extra = listOfRTCUsers[socket.userid].extra;
                    listOfRTCUsers[message.sender].connectedWith[message.remoteUserId].emit(socketMessageEvent, message);
                }
            } catch (e) {
                pushLogs('onMessageCallback', e);
            }
        }

        function joinARoom(message) {
            var roomInitiator = listOfRTCUsers[message.remoteUserId];

            if (!roomInitiator) {
                return;
            }

            var usersInARoom = roomInitiator.connectedWith;
            var maxParticipantsAllowed = roomInitiator.maxParticipantsAllowed;

            if (Object.keys(usersInARoom).length >= maxParticipantsAllowed) {
                socket.emit('room-full', message.remoteUserId);

                if (roomInitiator.connectedWith[socket.userid]) {
                    delete roomInitiator.connectedWith[socket.userid];
                }
                return;
            }

            var inviteTheseUsers = [roomInitiator.socket];
            if(Object.keys(usersInARoom)){
                Object.keys(usersInARoom).forEach(function(key) {
                    inviteTheseUsers.push(usersInARoom[key]);
                });
               }


            var keepUnique = [];
            if(inviteTheseUsers){
              inviteTheseUsers.forEach(function(userSocket) {
                  if (userSocket.userid == socket.userid) return;
                  if (keepUnique.indexOf(userSocket.userid) != -1) {
                      return;
                  }
                  keepUnique.push(userSocket.userid);

                  if (params.oneToMany && userSocket.userid !== roomInitiator.socket.userid) return;

                  message.remoteUserId = userSocket.userid;
                  //@R.GRID
                  userSocket.emit(socketMessageEvent, message);
              });
            }
        }


        var numberOfPasswordTries = 0;
        socket.on(socketMessageEvent, function(message, callback) {
            if (message.remoteUserId && message.remoteUserId === socket.userid) {
                // remoteUserId MUST be unique
                return;
            }

            try {
                if (message.remoteUserId && message.remoteUserId != 'system' && message.message.newParticipationRequest) {
                    if (listOfRTCUsers[message.remoteUserId] && listOfRTCUsers[message.remoteUserId].password) {
                        if (numberOfPasswordTries > 3) {
                            socket.emit('password-max-tries-over', message.remoteUserId);
                            return;
                        }

                        if (!message.password) {
                            numberOfPasswordTries++;
                            socket.emit('join-with-password', message.remoteUserId);
                            return;
                        }

                        if (message.password != listOfRTCUsers[message.remoteUserId].password) {
                            numberOfPasswordTries++;
                            socket.emit('invalid-password', message.remoteUserId, message.password);
                            return;
                        }
                    }

                    if (listOfRTCUsers[message.remoteUserId]) {
                        joinARoom(message);
                        return;
                    }
                }

                if (message.message.shiftedModerationControl) {
                    if (!message.message.firedOnLeave) {
                        onMessageCallback(message);
                        return;
                    }
                    shiftedModerationControls[message.sender] = message;
                    return;
                }

                // for v3 backward compatibility; >v3.3.3 no more uses below block
                if (message.remoteUserId == 'system') {
                    if (message.message.detectPresence) {
                        if (message.message.userid === socket.userid) {
                            callback(false, socket.userid);
                            return;
                        }

                        callback(!!listOfRTCUsers[message.message.userid], message.message.userid);
                        return;
                    }
                }

                if (!listOfRTCUsers[message.sender]) {
                    listOfRTCUsers[message.sender] = {
                        socket: socket,
                        connectedWith: {},
                        isPublic: false,
                        extra: {},
                        maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                    };
                }

                //@R.GRID
                // if someone tries to join a person who is absent
                if (message.message.newParticipationRequest) {
                    var waitFor = 60 * 10; // 10 minutes
                    var invokedTimes = 0;
                    (function repeater() {
                        if (typeof socket == 'undefined' || !listOfRTCUsers[socket.userid]) {
                            return;
                        }

                        invokedTimes++;
                        if (invokedTimes > waitFor) {
                            socket.emit('user-not-found', message.remoteUserId);
                            return;
                        }

                        if (listOfRTCUsers[message.remoteUserId] && listOfRTCUsers[message.remoteUserId].socket) {
                            joinARoom(message);
                            return;
                        }

                        setTimeout(repeater, 1000);
                    })();

                    return;
                }

                onMessageCallback(message);
            } catch (e) {
                pushLogs('on-socketMessageEvent', e);
            }
        });

        socket.on('disconnect', function() {
            try {
                if (socket && socket.namespace && socket.namespace.sockets) {
                    delete socket.namespace.sockets[this.id];
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {
                var message = shiftedModerationControls[socket.userid];

                if (message) {
                    delete shiftedModerationControls[message.userid];
                    onMessageCallback(message);
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {
                // inform all connected users
                if (listOfRTCUsers[socket.userid]) {
                    var firstUserSocket = null;

                    for (var s in listOfRTCUsers[socket.userid].connectedWith) {
                        if (!firstUserSocket) {
                            firstUserSocket = listOfRTCUsers[socket.userid].connectedWith[s];
                        }

                        listOfRTCUsers[socket.userid].connectedWith[s].emit('user-disconnected', socket.userid);

                        if (listOfRTCUsers[s] && listOfRTCUsers[s].connectedWith[socket.userid]) {
                            delete listOfRTCUsers[s].connectedWith[socket.userid];
                            listOfRTCUsers[s].socket.emit('user-disconnected', socket.userid);
                        }
                    }

                    if (socket.shiftModerationControlBeforeLeaving && firstUserSocket) {
                        firstUserSocket.emit('become-next-modrator', sessionid);
                    }
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            delete listOfRTCUsers[socket.userid];
        });

        if (socketCallback) {
            socketCallback(socket);
        }
    }


    function appendUserToRTCList(socket) {
        var alreadyExist = listOfRTCUsers[socket.userid];
        var extra = {};

        if (alreadyExist && alreadyExist.extra) {
            extra = alreadyExist.extra;
        }

        var params = socket.handshake.query;

        if (params.extra) {
            try {
                if (typeof params.extra === 'string') {
                    params.extra = JSON.parse(params.extra);
                }
                extra = params.extra;
            } catch (e) {
                extra = params.extra;
            }
        }

        listOfRTCUsers[socket.userid] = {
            socket: socket,
            connectedWith: {},
            isPublic: false, // means: isPublicModerator
            extra: extra || {},
            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
        };
    }

};




var enableLogs = false;

try {
    var _enableLogs = require('./config.json').enableLogs;

    if (_enableLogs) {
        enableLogs = true;
    }
} catch (e) {
    enableLogs = false;
}

var fs = require('fs');


function pushLogs() {
    if (!enableLogs) return;

    var logsFile = process.cwd() + '/logs.json';

    var utcDateString = (new Date).toUTCString().replace(/ |-|,|:|\./g, '');

    // uncache to fetch recent (up-to-dated)
    uncache(logsFile);

    var logs = {};

    try {
        logs = require(logsFile);
    } catch (e) {}

    if (arguments[1] && arguments[1].stack) {
        arguments[1] = arguments[1].stack;
    }

    try {
        logs[utcDateString] = JSON.stringify(arguments, null, '\t');
        fs.writeFileSync(logsFile, JSON.stringify(logs, null, '\t'));
    } catch (e) {
        logs[utcDateString] = arguments.toString();
    }
}

// removing JSON from cache
function uncache(jsonFile) {
    searchCache(jsonFile, function(mod) {
        delete require.cache[mod.id];
    });

    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(jsonFile) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
}


function searchCache(jsonFile, callback) {
    var mod = require.resolve(jsonFile);

    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function run(mod) {
            mod.children.forEach(function(child) {
                run(child);
            });

            callback(mod);
        })(mod);
    }
}



// The end

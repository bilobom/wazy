
//.................................................................
//.RRRRRRRRRR..........GGGGGGGG....GRRRRRRRRR...III..IDDDDDDDD.....
//.RRRRRRRRRRR........GGGGGGGGGG...GRRRRRRRRRR..III..IDDDDDDDDD....
//.RRRRRRRRRRR.......GGGGGGGGGGGG..GRRRRRRRRRR..III..IDDDDDDDDDD...
//.RRR.....RRR.......GGGG....GGGG..GRR.....RRR..III..IDD....DDDD...
//.RRR.....RRR.......GGG...........GRR.....RRR..III..IDD.....DDDD..
//.RRR...RRRRR.......GGG...........GRR...RRRRR..III..IDD.....DDDD..
//.RRRRRRRRRRR.......GGG...GGGGGG..GRRRRRRRRRR..III..IDD.....DDDD..
//.RRRRRRRRRR........GGG...GGGGGG..GRRRRRRRRR...III..IDD.....DDDD..
//.RRRRRRRRRR........GGG......GGG..GRRRRRRRRR...III..IDD.....DDDD..
//.RRR...RRRR........GGGG.....GGG..GRR...RRRR...III..IDD....DDDD...
//.RRR....RRRR.......GGGGGGGGGGGG..GRR....RRRR..III..IDDDDDDDDDD...
//.RRR....RRRR..... ..GGGGGGGGGGG..GRR....RRRR..III..IDDDDDDDDD....
//.RRR.....RRRR...0....GGGGGGGGG...GRR.....RRRR.III..IDDDDDDDD.....
//.................................................................


// var socketURL = socketURL;
var socket = null ;

// @Params
var parameters = '';
var havePermission = false ;

var modalRingingActive=false;
var modalRintoneActive=false;
// Audio Control
var timeToStopCall=20000;
// @Rining
var ringing = new Audio('Audio/rining.mp3');
ringing.loop = true;
var RinginisPlaying = false;
ringing.onplaying = function() {
  RinginisPlaying = true;
};
ringing.onpause = function() {
  RinginisPlaying = false;
};

// @Rington
var ringtone = new Audio('Audio/rington.mp3');
ringtone.loop = true;
var RingtonisPlaying = false;
ringtone.onplaying = function() {
  RingtonisPlaying = true;
};
ringtone.onpause = function() {
  RingtonisPlaying = false;
};
// /Audio Control


var remoteUserId ;

function initSocketUser() {

  parameters += '?soketType=' + 'socket';
  parameters += '&userid=' + userid;
  parameters += '&token='  + myAccessToken;

  try {
    io.sockets = {};
  } catch (e) {};

  try {
    socket = io(socketURL + parameters);
  } catch (e) {
    try{
      socket = io.connect(socketURL + parameters);
    }catch(e){}
  }


  if (socketURL == '/') {
    console.info('socketUser is connected at: ', location.origin + '/');
  } else {
    console.info('socketUser is connected at: ', socketURL);
  }

  socket.on('accessRejected',function(reason){
    alert(reason);
  });

  socket.on('UsersOnLine',function(users,all){
    updateListOfUsers(users,all);
  });

  socket.on('inCammingCall',function(caller,video){
    //debug('userid in inCammingCall ----------------------> ' + userid);
    if(caller == userid ) return ;
    title =  video ? 'in Camming video Call' : 'in Camming audio Call' ;
    msg = video ? caller + ' want to audio call' : caller + ' want to video call' ;

    document.getElementById('modalMessage').innerHTML=msg;
    startRingtone();
    $('#accept').click(function(){
      stopRingtone();
      //roomid = generateRoomId();
      connection.dontCaptureUserMedia=false;
      connection.dontAttachStream=false;
      connection.getUserMedia(function () {
        setTimeout(function(){
          socket.emit('setResponse',caller,userid,true,roomid);
          debug("rany b3at confirmation doka");
        }, 3000);
      },function (error) {
        UserHaveProblemWithHisCamera(error);
        reInitializeConnection();
      });
    });

    $('#refuse').click(function(){
      stopRingtone();
      socket.emit('setResponse',caller,userid,false,roomid);
    });
  });

  socket.on('getResponse',function(recever,accepted,roomid){
    if( accepted ){
     meet(true,roomid);
      stopRinging();
    } else {
      stopRingtone();
      stopRinging();
      // UserHaveProblemWithHisCamera();
      //Infom Of none-acceptance //TODO
    }
  });


  socket.on('cancelCall',function(recever){
    if(recever == userid) remoteCancelCall(recever);

  });


  // piratiw
  // when you call an unexistant user or offline user
  socket.on('userOffLine',function(recever){
    alert( recever +' off line or Buzzy !!! ');
  });


}


function UserHaveProblemWithHisCamera(error) {
  alert("problem with the camera" + error);
}


var once = false;
function remoteCancelCall(remoteid){
   stopRingtone();
}

function meet(iAmCaller,roomid,callback,callbackErrorMeet){
  callback = callback || function(){};
  callbackErrorMeet = callbackErrorMeet || function(){};
    connection.dontCaptureUserMedia=false;
    connection.dontAttachStream=false;
  //connection.roomid=roomid;
  //iAmCaller ? connection.open(roomid,function(){show(); callback();}) : connection.join(roomid,function(){show();callback();});
  if (iAmCaller) {
    connection.leave(function () {});
    debug("rooooooom ==" + roomid);
      setTimeout(function () {
        connection.join(roomid/*,function(){show();callback();}*/);
        debug("joined za3ma and about to callback rih")
        callback();
      },500);

  }else{
    //opening the gates hayaaaaa
    debug("ana 3aytooli rany rayeh getUserMedia w");


    // connection.renegotiate(null,function () {
    //   debug("sibon negotiatit ");
    //   callback();
    // });
  }
  console.log("roomid ===== "+roomid);
}

function show(){
  console.log("connection.userid====="+connection.userid);
  console.log("connection.session====="+connection.sessionid);
  console.log("connection.roomid====="+connection.roomid);
}


function startRinging(){
  if (modalRintoneActive) {stopRingtone()}
  modalRinging = document.getElementById('modalRinging');
  ringing.play();
  modalRinging.show();
  modalRingingActive=true;
}


function stopRinging(){
  ringing.pause();
  modalRinging.hide();
  modalRingingActive=false;
}


function startRingtone(){
  if (modalRingingActive) {stopRinging()}
  modalRingtone = document.getElementById('modalRingtone');
  modalRingtone.show();
  ringtone.play();
  modalRintoneActive=true;
}


function stopRingtone(){
  ringtone.pause();
  modalRingtone.hide();
  modalRintoneActive=false;
}


function generateRoomId() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


function getRandomString() {
  if (window.crypto && window.crypto.getRandomValues && navigator.userAgent.indexOf('Safari') === -1) {
      var a = window.crypto.getRandomValues(new Uint32Array(3)),
          token = '';
      for (var i = 0, l = a.length; i < l; i++) {
          token += a[i].toString(36);
      }
      return token;
  } else {
      return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
  }
}


function cancelCall(){
  //should emit cancelling
  socket.emit('cancelCall',remoteUserId);
  stopRinging();
}


function call(remoteid,video){
  remoteUserId = remoteid ;
  startRinging();
  socket.emit('call',userid,remoteid,video);
  setTimeout(function(){
    stopRinging();

  }, timeToStopCall);
}


function closeApp(){
  navigator.app.exitApp();
}

function updateListOfUsers(users,all){
  $('#onlineUsers').empty();
  debug(users);
  users.forEach(function(username) {
    if(username !== userid ){
      appendUsertoList(username);
    }
  });
}

function closeUserSocket() {
  try {
      io.sockets = {};
  } catch (e) {};

  if (!socket) return;

  if (typeof socket.disconnect === 'function') {
      socket.disconnect();
  }

  if (typeof socket.resetProps === 'function') {
      socket.resetProps();
  }
  socket = null;
}


function appendUsertoList(username) {
  //onclick="wantingToChat()"
  $userHTML='<ons-list-item class="menu-item"  tappable>';
  $userHTML+= '<ons-icon size="25px" style="color:green;" icon="fa-user"></ons-icon>&nbsp;&nbsp;';
  $userHTML+= username;
  $userHTML+='&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<ons-icon id="videoCall';
  $userHTML+= username;
  $userHTML+= '" icon="md-videocam" size="25px"></ons-icon>';
  $userHTML+='&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<ons-icon id="audioCall';
  $userHTML+= username;
  $userHTML+= '" icon="md-phone" size="25px"></ons-icon>';
  $userHTML+='</ons-list-item>';

  //$userHTML+= ' <i id="audioCall' + username + '" class="material-icons btn" style="color:blue;font-size:22px;float:right;" >phone_forwarded</i>';
  //$userHTML+= ' <i id="videoCall' + username + '" class="fa fa-video-camera btn" style="color:blue;font-size:22px;float:right;"  ></i></a>';
   //My ons-list element
  $('#onlineUsers').append($userHTML);

  $('#audioCall'+username).click(function(){
    call(username,false);
  });

  $('#videoCall'+username).click(function(){
    call(username,true);
  });
}




// The End



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


var connection ;
var maxParticipantsAllowed = 2 ;

var userid = $('input#userID').val() ;
var remoteUser = '';

var roomid = '';

var file_container ;


var sessionParam = {
      audio: false,
      video: false,
      data: true
}

var bandwidth = {
  audio: 510,  // 50 kbps
  video: 2000 // 256 kbps
}

var inRemoteStream = false;
var inCall = false;

$(document).ready(function(){
  if(connection) return;
  initSoket();

  // below method "keepCheckingForRoom" keeps checking for room until joins it
  (function keepCheckingForRoom() {
      if(!connection.receiveFirstRemoteStream) {
          setTimeout(keepCheckingForRoom, 3000);
          return;
      }
      connection.checkPresence(connection.sessionid, function(isRoomExist, roomid) {
          if(connection.isInitiator) {
              document.querySelector('h1').innerHTML = 'You are room owner!';
              return;
          }
          if(connection.peers[connection.sessionid]) {
              setTimeout(keepCheckingForRoom, 3000);
              document.querySelector('h1').innerHTML = 'Room owner is in the room!';
              return;
          }
          if (isRoomExist === true) {
              connection.join(roomid);
              document.querySelector('h1').innerHTML = 'Rejoined the room!!!!';
              setTimeout(keepCheckingForRoom, 3000);
              return;
          }
          document.querySelector('h1').innerHTML = 'Room owner left. Rechecking for the room...';
          setTimeout(keepCheckingForRoom, 3000);
      });
  })();
  // UI

  (function() {
      var params = {},
          r = /([^&=]+)=?([^&]*)/g;
      function d(s) {
          return decodeURIComponent(s.replace(/\+/g, ' '));
      }
      var match, search = window.location.search;
      while (match = r.exec(search.substring(1)))
          params[d(match[1])] = d(match[2]);
      window.params = params;
  })();

});


function initSoket(){

  document.getElementById('leave-room').disabled = true;
  window.enableAdapter = true;


  connection = new RTCMultiConnection();
  
  var iceServers = [];

  iceServers.push({
       urls: 'stun:stun.l.google.com:19302'
  });

  connection.iceServers = iceServers;
  connection.enableLogs=true;
  connection.autoReDialOnFailure = true;
  connection.autoCloseEntireSession = true;
  //file sharing
  connection.enableFileSharing = true;
  connection.sdpConstraints.mandatory = {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
  };
  //enabling audio/video mmcblk0p2
  connection.session = sessionParam ;

  connection.bandwidth = bandwidth;


  // to make it one-to-one
  connection.maxParticipantsAllowed = maxParticipantsAllowed;

  connection.onRoomFull = function(roomid) {
    closeConnection();
    connection.attachStreams.forEach(function(stream) {
       stream.stop();
    });

      alert('There is a call going On');
  };


   connection.onstream = function(event) {
       console.log(event);
       if(event.type=='remote'){
         remoteStream(event);
       }else { //local
          localStream(event);
       }
   };

   connection.onstreamended = function(event) {
       var mediaElement = document.getElementById(event.streamid);
       if (mediaElement) {
           mediaElement.parentNode.removeChild(mediaElement);
       }
   };

   connection.openOrJoin( userid ,function() {
     localStorage.setItem('rmc-room-id', this.value);
   });

   connection.onmessage = function(event) {
       appendDIV(event);
   };

  connection.onMediaError = function(error, constraints) {
         reInitializeConnection();
  };


  $("#input-text").keyup(function(e) {
       //console.log(this.value);
       if (e.keyCode != 13) return;
       // removing trailing/leading whitespace
       this.value = this.value.replace(/^\s+|\s+$/g, '');
       if (!this.value.length) return;
       if (remoteUser == null) {
           alert("Please connect with a recipient");
           return;
       }else {
           connection.send(this.value);
           appendDIV(this.value);
           this.value = '';
       }
     });

}



function call(){
  inCall = true;
  document.getElementById('leave-room').disabled = false;
  remoteUser = document.getElementById('room-id').value;
  roomid = remoteUser ;
  connection.openOrJoin( roomid ,function() {
     enableAudioVideo(true);
     localStorage.setItem('rmc-room-id', this.value);
  });
}


function inAnswer(remoteUserId){
  //attacheStream(remoteUserId);
}


function attacheStream(remoteUserId){
    if(inCall) return;
    //alert("attachement Stream local to --> "+remoteUserId);
    connection.addStream(connection.session,remoteUserId);

    //connection.renegotiate(remoteUserId);
}




function incammingCall(remoteUserId){
  remoteUser = remoteUserId;
  roomid = remoteUser;
  document.getElementById('leave-room').disabled = false;
  enableAudioVideo(true);
  //connection.openOrJoin(userid);
  connection.addStream(connection.session,userid);
}




function enableAudioVideo(bool){
  connection.session.video  = bool;
  connection.session.audio  = bool;
}



function localStream(event){
  if(!event) return ;
  if(event.userid != userid) return;

  console.log("localStream !!!!!!!!!!!!!!");
  connection.videosContainer = document.getElementById('local-vid');
  var width = parseInt(connection.videosContainer.clientWidth);
  var mediaElement = getHTMLMediaElement(event.mediaElement, {
       title: event.userid,
       width: width,
       showOnMouseEnter: false
   });
  connection.videosContainer.appendChild(mediaElement);
  setTimeout(function() {
      mediaElement.media.play();
  }, 1);
  mediaElement.id = event.streamid;
  mediaElement.setAttribute('data-userid', event.userid);
}




function remoteStream(event){
  if(inRemoteStream) return;
  inRemoteStream = true;
  console.log("****************** entered ***************************** ");
  connection.videosContainer = document.getElementById('remote-vid');
  var width = parseInt(connection.videosContainer.clientWidth);
   var mediaElement = getHTMLMediaElement(event.mediaElement, {
       title: event.userid,
       width: width,
       showOnMouseEnter: false
   });
   remoteUser=event.userid;
  connection.videosContainer.appendChild(mediaElement);
  setTimeout(function() {
      mediaElement.media.play();
  }, 1);
  mediaElement.id = event.streamid;
  mediaElement.setAttribute('data-userid', event.userid);

}



function sendMessage(){
   // removing trailing/leading whitespace
   /*this.value = this.value.replace(/^\s+|\s+$/g, '');
   if (!this.value.length) return;
   if (remoteUser == null) {
       alert("Please connect with a recipient");
       return;
   }else {
       connection.send(this.value);
       appendDIV(this.value);
       this.value = '';
   }*/
}





function takePhoto(video) {
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    var context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
}



function leaveRoom(){
  alert('leave Room !!!');
   connection.attachStreams.forEach(function(localStream) {
       localStream.stop();
   });
   connection.leave();
   connection.closeSocket();

   reInitializeConnection();
}



function reInitializeConnection(){
  inRemoteStream = false;
  enableAudioVideo(false);

  document.getElementById('leave-room').disabled = true;
  document.getElementById('open-room').disabled = false;

  // reconnect to localRoom
  connection.openOrJoin( userid ,function() {
      localStorage.setItem('rmc-room-id', this.value);
   });

}



//TODO function to ch  change resolutition

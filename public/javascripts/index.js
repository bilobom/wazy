
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

var maxParticipantsAllowed = 1 ;

var userid = $('input#userID').val() ;

var remoteUser = null;

var roomid = $('input#userID').val();

var sessionParam = {
      audio: true,
      video: true,
      data: true
}

var bandwidth = {
  audio: 510,  // 50 kbps
  video: 2000 // 256 kbps
}

var localStreamID;

// Cordova initialization
var app = {

    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
			appInitialize();
		}
};
app.initialize();


function appInitialize(){
	//debug("ready");
	if(connection) return;
	initSoket();
	RTCevents();

	(function keepCheckingForRoom() {
      debug('-------- keepCheckingForRoom --------');
			if(!connection.receiveFirstRemoteStream) {
					setTimeout(keepCheckingForRoom, 3000);
					return;
			}
			connection.checkPresence(connection.sessionid, function(isRoomExist, roomid) {
					if(connection.peers[connection.sessionid]) {
							setTimeout(keepCheckingForRoom, 3000);
							return;
					}
					if (isRoomExist === true) {
							connection.join(roomid);
							setTimeout(keepCheckingForRoom, 3000);
							return;
					}
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
}


function initSoket(){

  window.enableAdapter = true;


  connection = new RTCMultiConnection();

  // @ Parameters
  var iceServers = [];
  iceServers.push({
       urls: 'stun:stun.l.google.com:19302'
  });
  connection.dontCaptureUserMedia=false;
  connection.iceServers = iceServers;
  connection.enableLogs=true;
  connection.autoReDialOnFailure = true;
  connection.autoCloseEntireSession = true;
  //file sharing
  connection.socketURL= "https://rgridserve2.herokuapp.com/"
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

}


function RTCevents(){

  connection.onRoomFull = function(roomid) {
    connection.attachStreams.forEach(function(stream) {
       stream.stop();
    });
      alert('There is a call going On');
   };

  connection.onstream = function(event) {
     debug(event);
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
         debug('Media Error ---------> '+error);
  };
  connection.onclose= function(event){
  	debug(event);
  }

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
  remoteUser = $('#callee-id').val();
  if (remoteUser) {
  	  $("#entrence3").addClass("hidden");
      $("#videos").removeClass("hidden");
      $("#icons").removeClass("hidden");
  	connection.userid=userid;
	  roomid = remoteUser.toLowerCase();
	  connection.openOrJoin(roomid);
  }else alert("please enter a name")

}


function localStream(event){
  if(!event) return ;
  if(event.userid != userid) return;
  debug('local stream Entreed !!!!!!');

  connection.videosContainer = $('#mini-video')[0];
  debug(event.mediaElement);
  var mediaElement = getHTMLMediaElement(event.mediaElement, {
       title: event.userid,
       showOnMouseEnter: false
   });
  mediaElement.style = "top: 20px;right: 20px;  height: 100%; width: 100%; transition: opacity 1s;";
  connection.videosContainer.appendChild(mediaElement);
  debug('local stream playing !!!!!!');
  mediaElement.play();
  mediaElement.id = event.streamid;
  localStreamID=event.streamid;
  mediaElement.setAttribute('data-userid', event.userid);
}


function remoteStream(event){
  connection.videosContainer = $('#remote-video')[0];
  var width = parseInt(connection.videosContainer.clientWidth);
  var mediaElement = getHTMLMediaElement(event.mediaElement, {
     title: event.userid,
     width: width,
     showOnMouseEnter: false
  });
  remoteUser=event.userid;
  mediaElement.style = "display: block; height:100%;min-height:100%;width:100%;min-width:100%;object-fit: cover;position: absolute;-moz-transform: rotateY(180deg);-ms-transform: rotateY(180deg);-o-transform: rotateY(180deg);-webkit-transform: rotateY(180deg);transform: rotateY(180deg);transition: opacity 1s;";
  connection.videosContainer.appendChild(mediaElement);
  mediaElement.play();
  mediaElement.id = event.streamid;
  mediaElement.setAttribute('data-userid', event.userid);
}


function sendMessage(){
  message = $("#input-text").val();
  if (!message.length) return;
  if (remoteUser == null) {
      alert("Please connect with a recipient");
      return;
  }else {
      connection.send(message);
      appendDIV(message,userid);
      $("#input-text").val('');
  }
}


function toggleAudio(){
	if (localStreamID) {
		$('#mute-audio path').eq(0).attr('class') === 'on' ? connection.streamEvents[localStreamID].stream.mute('audio') : connection.streamEvents[localStreamID].stream.unmute('audio');
			//		toggleSvg('mute-audio');
		$('#mute-audio path').eq(0).attr('class') === 'on' ? $('#mute-audio path').eq(0).attr('class', 'off') : $('#mute-audio path').eq(0).attr('class', 'on');
		$('#mute-audio path').eq(1).attr('class') === 'on' ? $('#mute-audio path').eq(1).attr('class', 'off') : $('#mute-audio path').eq(1).attr('class', 'on');
	}
}


function toggleVideo(){
	if (localStreamID){
		$('#mute-video path').eq(0).attr('class') === 'on' ? connection.streamEvents[localStreamID].stream.mute('video') : connection.streamEvents[localStreamID].stream.unmute('video');
		//		toggleSvg('mute-video');
	  $('#mute-video path').eq(0).attr('class') === 'on' ? $('#mute-video path').eq(0).attr('class', 'off') : $('#mute-video path').eq(0).attr('class', 'on');
		$('#mute-video path').eq(1).attr('class') === 'on' ? $('#mute-video path').eq(1).attr('class', 'off') : $('#mute-video path').eq(1).attr('class', 'on');
	}
}


function MiniToLocal(){
	$('#local-video').removeClass("hidden");

	theVideo= $('#mini-video video')[0];
	theVideo.remove();
	connection.videosContainer= $('#local-video')[0];
	connection.videosContainer.appendChild(theVideo);
	$('#me').attr("onclick","localToMini" );
	//$('#me').attr("style","z-index:3" );

	setTimeout(function() {
		theVideo.play();
	}, 1);
}


function localToMini(){
	 $('#local-video').addClass("hidden");
	theVideo= $('#local-video video')[0];
	theVideo.stop();
	$('#me').attr("onclick","miniToLocal()" );
	connection.videosContainer= $('#mini-video')[0];
	connection.videosContainer.appendChild(theVideo);
	setTimeout(function() {
		theVideo.play();
	}, 1);
}


function deser(JSONFormat){
  	// to render JSON format as if desirializing
	return JSON.stringify(JSONFormat);
}


function switchCamera(){

	if(cameraFront == cameraRear || !cameraRear){
		debug("the same cammera or no second camera");
		return;
	}
	else{

		// debug("firstcamera="+cameraRear);
		// debug("seccamera="+cameraFront);
		video=$('#mini-video video')[0] || $('#local-video video')[0];
		if(video){
			debug("video=" + deser(video)+"***"+ video);
			debug("------video.scrObject="+video.srcObject +"-----video.src="+video.src)
			video.pause();
			video.removeAttribute('srcObject'); // empty source
			video.load();
		}
		if(!connection.attachStreams.length) {
			connection.mediaConstraints.video.optional = [{
				sourceId: cameraRear
			}];
			return;
		}
		if(!connection.getAllParticipants().length) {
			connection.attachStreams.forEach(function(stream) {

				stream.stop();
			});
			//normally invoke usermedia
			connection.mediaConstraints.video.optional = [{
				sourceId: cameraRear
			}];
			connection.openOrJoin(userid);
			var temp=cameraRear;
			cameraRear=cameraFront;
			cameraFront=temp;
		return;
		}
		//debug("cameraRear="+cameraRear );
		//debug("camerafront="+cameraFront );

		connection.mediaConstraints.video.optional = [{
			sourceId: cameraRear
		}];
		var cameraOptions = {
		    audio: true,
		    video: true,
		    data: true
		};
		//getUserMedia
		//var streamEvent;
		connection.captureUserMedia(function(camera) {
		    var video = document.createElement('video');
		    video.src = URL.createObjectURL(camera);
		    video.muted = true;

		    var streamEvent = {
		        type: 'local',
		        stream: camera,
		        streamid: camera.id,
		        mediaElement: video,
		        isAudioMuted: true
		    };
		    connection.onstream(streamEvent);
		   debug("cameraEvent 2nd----------"+ streamEvent);

		},connection.mediaConstraints);
		var flag=true;
		connection.attachStreams.forEach(function(localStream) {
			debug("localllllllllis="+localStream.id );
			debug(deser(localStream));
			if (flag) {
				//localStream.stop();
				connection.removeStream(localStream.streamid,remoteUser);
			}

		});
		//getUsermedia
		connection.addStream(connection.session,remoteUser);


		var temp=cameraRear;
		cameraRear=cameraFront;
		cameraFront=temp;
	}
}


function randomHash(){
	return Math.random().toString(36).substr(2, 5);
}


//@Bilal End
function takePhoto(video) {
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    var context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
}



function Hungup(){
   if(remoteUser) connection.deletePeer(remoteUser);
   connection.attachStreams.forEach(function(localStream) {
       localStream.stop();
   });
   $("#videos").addClass("hidden");
   $("#icons").addClass("hidden");
   $('#entrence3').removeClass("hidden");
}

function reInitializeConnection(){

}

function debug(str){
	if(connection.enableLogs){
		console.log(str);
	}else return
}



//TODO function to ch  change resolutition

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
var socketURL = "https://rgridserve2.herokuapp.com/" ;
var socketURL = "" ;


var maxParticipantsAllowed = 2 ;
var userid = $('input#userID').val();
var myAccessToken = $('input#token').val();

console.log('------------> naiif '+userid + '--------------> '+myAccessToken);

var remoteUser = '';
var roomid ;
var enableLogs=true;
var modalRinging;
var modalMessage;
var modalRingtone;

var videoIsMute = false , audioIsMute = false ;


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


var a=0;
var app = {
    // Application Constructor
    initialize: function() {
      this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() {
      ons.ready(function(){
      	//(device.platform == "browser") ? a++ : window.CacheClear();
  	    modalRinging = document.getElementById('modalRinging');
  	    modalRingtone = document.getElementById('modalRingtone');
    		if(modalRinging) modalRinging.hide();
    		if(modalRingtone) modalRingtone.hide();

        fn.load('main.html');
        setTimeout(function () {
          document.getElementById('name').innerHTML=userid;
        },2000);

        userid = $('input#userID').val();
        myAccessToken = $('input#token').val();
        console.log('------------> avant init basic '+userid + '--------------> '+myAccessToken);
        initBasics();

  		});

    }
};
app.initialize();


function initSoket(){
  window.enableAdapter = true;
  connection = new RTCMultiConnection();
  //connection.userid=userid;
  connection.enableLogs=enableLogs;

  // @ Parameters
  var iceServers = [];
  var CSN;
  iceServers.push({
  	urls: 'stun:stun.l.google.com:19302'
  });
  connection.iceServers = iceServers;
  connection.autoReDialOnFailure = true;
  connection.autoCloseEntireSession = true;
  //file sharing
  connection.socketURL = socketURL ;
  connection.enableFileSharing = true;
  connection.sdpConstraints.mandatory = {
  	OfferToReceiveAudio: true,
  	OfferToReceiveVideo: true
  };
  //enabling audio/video mmcblk0p2
  connection.session = sessionParam ;

  //Bilal Initial setup
  connection.dontCaptureUserMedia=true;
  connection.dontAttachStream=true;

  connection.bandwidth = bandwidth;
  connection.mediaConstraints = {
    video: true,
    audio: true
  };
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

	connection.onmessage = function(event) {
	};

	connection.onMediaError = function(error, constraints) {
		alert("Error:  "+ error);
		reInitializeConnection();
	};

	connection.onclose= function(event){
		hungup();
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


function hungup(){
	if(remoteUser) connection.deletePeer(remoteUser);
	connection.attachStreams.forEach(function(localStream) {
		localStream.stop();
	});
	connection.close();
	connection.closeSocket();
	reInitializeConnection();
}


function reInitializeConnection(){
	connection = null;
	location.reload();
	initSoket();
	//connection.userid=userid;
	RTCevents();
	openGate();
}


function openGate(){
	connection.autoReDialOnFailure = true;
	connection.autoCloseEntireSession = true;
	roomid = generateRoomId();
	connection.open(roomid);
}


function debug(str){
	if(enableLogs){
		console.log(str);
	}else return
}


function initBasics(argument) {
  initSoket();
  connection.userid=userid;
  RTCevents();
  initSocketUser();
  openGate();
  setSwipeable(menu,true);
  modalRinging = document.getElementById('modalRinging');
  modalRingtone = document.getElementById('modalRingtone');
  modalMessage=document.getElementById('message');
  debug("modalRinging== "+ modalRinging);
}


// The End !!!

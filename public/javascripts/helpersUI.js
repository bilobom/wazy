

function flashMessage(msg,target){
      var popElement =document.getElementById(target);
      var msgElement =document.getElementById('messageError');
      msgElement.innerHTML= msg;
      document.getElementById('popoverLogin').show(popElement);
}

function UnFlashMessage(){
  document.getElementById('popoverLogin').hide();
}

function checkConnection() {
    var networkState = navigator.connection.type;
    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';
    return networkState;
}


function setSwipeable(Element,swipeable) {
  if (swipeable) {
    Element.setAttribute('swipeable', '');
  } else {
    Element.removeAttribute('swipeable');
  }
}


function wantingToChat() {
  fn.load("chat.html", function () {
    loadJsAsRunTime("chat.js");
  });
}


function loadJsAsRunTime(src){
  debug("entering load with ==="+src);
  $('head').append('<script src=wazy_js/"'+src+'" ></script>');
}


function toggleAudio(){

  if (localStreamID) {
    audioIsMute ? connection.streamEvents[localStreamID].stream.mute('audio') : connection.streamEvents[localStreamID].stream.unmute('audio');
    audioIsMute = !audioIsMute ;
  }
}


function toggleVideo(){
  if (localStreamID){
    videoIsMute ? connection.streamEvents[localStreamID].stream.mute('video') : connection.streamEvents[localStreamID].stream.unmute('video');
    videoIsMute = !videoIsMute;
  }
}


window.fn = {};
window.fn.open = function() {
  var menu = $('#menu')[0];
  menu.open();
};

window.fn.load = function(page, callback) {
  callback = callback || function () {};
  var content = document.getElementById('content');
  var menu = $('#menu')[0];
  content.load(page);
  menu.close(menu);
  callback();
  //menu.close.bind(menu);
};

function MiniToLocal(){
  $('#local-video').removeClass("hidden");
  theVideo= $('#mini-video video')[0];
  theVideo.remove();
  connection.videosContainer= $('#local-video')[0];
  connection.videosContainer.appendChild(theVideo);
  setTimeout(function() {
    theVideo.play();
  }, 1);
}


function localToMini(){
  $('#local-video').addClass("hidden");
  theVideo= $('#local-video video')[0];
  theVideo.stop();
  connection.videosContainer= $('#mini-video')[0];
  connection.videosContainer.appendChild(theVideo);
  setTimeout(function() {
    theVideo.play();
  }, 1);
}


var toggled= false;

function changeCamera(){
  //environment
  var facing;
  toggled ? facing='user' : facing='environment';
  video= document.getElementById(localStreamID);
  if (!video) {return}
  video.srcObject && video.srcObject.getTracks().forEach(t => t.stop());
  //debug("video")
  toggled ? toggled=false : toggled=true;
  var mediaConstraints = {
      audio: true, // NO need to capture audio again
      video: {
          facingMode:{exact: facing}
      }
  };
  navigator.mediaDevices.getUserMedia(mediaConstraints).then(function (stream) {
    connection.attachStreams.push(stream);
    stream.streamid = stream.streamid || stream.id || getRandomString();
    var event={
      mediaElement: stream,
      streamid: stream.streamid,
    };
    localStream(event,function () {
        connection.renegotiate();
    });

  });
}


function localStream(event ,callback){
  callback = callback || function(){};
  if(!event) return ;

  connection.videosContainer = $('#mini-video')[0];
  while (connection.videosContainer.firstChild) {
      connection.videosContainer.removeChild(connection.videosContainer.firstChild);
  }
  console.log(event.mediaElement);
  var mediaElement = getHTMLMediaElement(event.mediaElement, {
    showOnMouseEnter: false
  });
  mediaElement.muted = true;
  mediaElement.volume = 0;
  mediaElement.style = "top: 20px;right: 20px;  height: 100%; width: 100%; transition: opacity 1s;";
  connection.videosContainer.appendChild(mediaElement);
  setTimeout(function() {
    mediaElement.play();
  }, 1);
  mediaElement.id = event.streamid;
  localStreamID=event.streamid;
  //mediaElement.setAttribute('data-userid', event.userid);
  callback();
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
  mediaElement.style = "display: block; height: 100%;object-fit: cover;position: absolute;-moz-transform: rotateY(180deg);-ms-transform: rotateY(180deg);-o-transform: rotateY(180deg);-webkit-transform: rotateY(180deg);transform: rotateY(180deg);transition: opacity 1s;width: 100%;";
  connection.videosContainer.appendChild(mediaElement);
  setTimeout(function() {
    mediaElement.play();
  }, 1);
  mediaElement.id = event.streamid;
  mediaElement.setAttribute('data-userid', event.userid);
}

function takePhoto(video) {
  var canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;

  var context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

//onclick="MiniToLocal()"

var inFullcreen=false
//Event listener
function launchFullscreen(element) {
  if (element.requestFullscreen) {
      element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  }
  inFullcreen=true;
  debug("full screen lanched");
}

function exitFullScreen() {
    if (document.fullscreen) {
        document.cancelFullScreen();
    }

    if (document.mozFullScreen) {
        document.mozCancelFullScreen();
    }

    if (document.webkitIsFullScreen) {
        document.webkitCancelFullScreen();
    }
    inFullcreen=false;
    debug("full screen exit");
}

document.addEventListener('click', function(event) {
  if (event.target.matches('#mini-video') ) {
    debug("double tap detected");
    var videoMiniContainer= $('#mini-video')[0];
    inFullcreen ? exitFullScreen() : launchFullscreen(videoMiniContainer);
  }
});


function logout() {
  $('form#logout').submit();
}



// The End !!!


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


var userid = $('input#userID').val();

var socketURL = '/';
var socket = null ;

// @Params
var parameters = '';

var wantToMeet = false ;

parameters += '?soketType=' + 'socket';
parameters += '&userid=' + userid;


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
      console.info('socket.io is connected at: ', location.origin + '/');
  } else {
      console.info('socket.io is connected at: ', socketURL);
  }



// Audio Control

// @Rining
var rining = new Audio('/Audio/rining.mp3');
rining.loop = true;
var RinginisPlaying = false;
rining.onplaying = function() {
  RinginisPlaying = true;
};
rining.onpause = function() {
  RinginisPlaying = false;
};

// @Rington
var rington = new Audio('/Audio/rington.mp3');
rington.loop = true;
var RingtonisPlaying = false;
rington.onplaying = function() {
  RingtonisPlaying = true;
};
rington.onpause = function() {
  RingtonisPlaying = false;
};

// /Audio Control


socket.on('UsersOnLine',function(users,all){
  updateListOfUsers(users,all);
});


socket.on('inCammingCall',function(caller,video){
  if(caller == userid ) return ;
  title =  video ? 'in Camming video Call' : 'in Camming audio Call' ;
  msg = video ? caller + ' is calling you videoCall !!' : caller + ' is calling you !!' ;
  Confirm(title, msg, 'answer', 'hungup' ,caller,video);
  rington.play();
});


socket.on('getResponse',function(recever,accepted,roomid){
  rining.pause();
  if( accepted && roomid && wantToMeet ) meet(recever,roomid);
});


socket.on('userOffLine',function(recever){
  alert( recever +' off line or Buzzy !!! ');
});


function call(remoteid,video){
  wantToMeet = true ;
  console.log(userid +' Call ' + remoteid );
  // on.('call', (caller recever video) )
  socket.emit('call',userid,remoteid,video);
  rining.play();
}


function meet(remoteid , roomid){
  alert('meet '+ remoteid + ' in ---> '+roomid)
}


function updateListOfUsers(users,all){
  console.log(users);


  $('#list-users').html('<div class="list-group" id="list-users"><a class="list-group-item list-group-item-action h4 text-center text-light bg-secondary"> On line Users </a><div>');

  users.forEach(function(username) {
    if(username !== userid ){
      appendUsertoList(username);
    }
  });

}


function appendUsertoList(username) {
  $userHTML = '';

  $userHTML+= '<a class="list-group-item list-group-item-action text-black-50">';
  $userHTML+= '<i class="fa fa-user" style="font-size:30px;position:relative;margin-right:1%;">';
  $userHTML+= ' <i class="fa fa-circle" style="color:green;font-size:15px;position:absolute;left:15px;top:15px;"></i>';
  $userHTML+= '</i> ';
  $userHTML+= username
  $userHTML+= ' <i id="audioCall' + username + '" class="material-icons btn" style="color:blue;font-size:22px;float:right;" >phone_forwarded</i>';
  $userHTML+= ' <i id="videoCall' + username + '" class="fa fa-video-camera btn" style="color:blue;font-size:22px;float:right;"  ></i></a>';

  $('#list-users').append($userHTML);

  $('#audioCall'+username).click(function(){
      call(username,false);
  });

  $('#videoCall'+username).click(function(){
      call(username,true);
  });


}



function Confirm(title, msg, $true, $false,caller,video) { /*change*/


  var $style = '' +
        'body {font-family: sans-serif}' +
        '.dialog-ovelay {position: absolute;top: 0;left: 0;right: 0;bottom: 0;background-color: rgba(0, 0, 0, 0.50);z-index: 999999}'+
        '.dialog-ovelay .dialog {width: 400px;margin: 100px auto 0;background-color: #fff;box-shadow: 0 0 20px rgba(0,0,0,.2);border-radius: 3px;overflow: hidden}'+
        '.dialog-ovelay .dialog header {padding: 10px 8px;background-color: #f6f7f9;border-bottom: 1px solid #e5e5e5}'+
        '.dialog-ovelay .dialog header h3 {font-size: 14px;margin: 0;color: #555;display: inline-block}'+
        '.dialog-ovelay .dialog header .fa-close {float: right;color: #c4c5c7;cursor: pointer;transition: all .5s ease;padding: 0 2px;border-radius: 1px    }'+
        '.dialog-ovelay .dialog header .fa-close:hover {color: #b9b9b9}'+
        '.dialog-ovelay .dialog header .fa-close:active {box-shadow: 0 0 5px #673AB7;color: #a2a2a2}'+
        '.dialog-ovelay .dialog .dialog-msg {padding: 12px 10px}'+
        '.dialog-ovelay .dialog .dialog-msg p{margin: 0;font-size: 15px;color: #333}'+
        '.dialog-ovelay .dialog footer {border-top: 1px solid #e5e5e5;padding: 8px 10px}'+
        '.dialog-ovelay .dialog footer .controls {direction: rtl}';
        '.dialog-ovelay .dialog footer .controls .button {padding: 5px 15px;border-radius: 3px}'+
        '.button {cursor: pointer}'+
        '.button-default {background-color: rgb(248, 248, 248);border: 1px solid rgba(204, 204, 204, 0.5);color: #5D5D5D;}'+
        '.button-danger {background-color: #f44336;border: 1px solid #d32f2f;color: #f5f5f5}'+
        '.link {padding: 5px 10px;cursor: pointer}';


  var $content =    "<style>"+$style+"</style>"+
                    "<div class='dialog-ovelay'>" +
                    "<div class='dialog'><header>" +
                     " <h3> " + title + " </h3> " +
                     "<i class='fa fa-close'></i>" +
                 "</header>" +
                 "<div class='dialog-msg'>" +
                     " <p> " + msg + " </p> " +
                 "</div>" +
                 "<footer>" +
                     "<div class='controls'>" +
                         " <button class='button button-danger  doAction'>" + $true + "</button> " +
                         " <button class='button button-default cancelAction'>" + $false + "</button> " +
                     "</div>" +
                 "</footer>" +
               "</div>" +
              "</div>" ;

  roomid = caller+'-'+userid;


  $('body').prepend($content);
  $('.doAction').click(function () {
    // window.open($link, "_blank"); /*new*/
    $(this).parents('.dialog-ovelay').fadeOut(500, function () {
      socket.emit('setResponse',caller,userid,true,roomid);
      meet(caller,roomid);
      rington.pause();
      $(this).remove();
    });
  });
  $('.cancelAction, .fa-close').click(function () {
    $(this).parents('.dialog-ovelay').fadeOut(500, function () {
      socket.emit('setResponse',caller,userid,false,roomid);
      rington.pause();
      $(this).remove();
    });
  });

}






// The End

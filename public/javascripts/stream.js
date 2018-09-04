// getUserMediaHandler.js

function setStreamType(constraints, stream) {
    if (constraints.mandatory && constraints.mandatory.chromeMediaSource) {
        stream.isScreen = true;
    } else if (constraints.mozMediaSource || constraints.mediaSource) {
        stream.isScreen = true;
    } else if (constraints.video) {
        stream.isVideo = true;
    } else if (constraints.audio) {
        stream.isAudio = true;
    }
}

// allow users to manage this object (to support re-capturing of screen/etc.)
window.currentUserMediaRequest = {
    streams: [],
    mutex: false,
    queueRequests: [],
    remove: function(idInstance) {
        this.mutex = false;

        var stream = this.streams[idInstance];
        if (!stream) {
            return;
        }

        stream = stream.stream;

        var options = stream.currentUserMediaRequestOptions;

        if (this.queueRequests.indexOf(options)) {
            delete this.queueRequests[this.queueRequests.indexOf(options)];
            this.queueRequests = removeNullEntries(this.queueRequests);
        }

        this.streams[idInstance].stream = null;
        delete this.streams[idInstance];
    }
};

function getUserMediaHandler(options) {
    if (currentUserMediaRequest.mutex === true) {
        currentUserMediaRequest.queueRequests.push(options);
        return;
    }
    currentUserMediaRequest.mutex = true;

    // easy way to match
    var idInstance = JSON.stringify(options.localMediaConstraints);

    function streaming(stream, returnBack) {
        setStreamType(options.localMediaConstraints, stream);
        options.onGettingLocalMedia(stream, returnBack);

        var streamEndedEvent = 'ended';

        if ('oninactive' in stream) {
            streamEndedEvent = 'inactive';
        }
        stream.addEventListener(streamEndedEvent, function() {
            delete currentUserMediaRequest.streams[idInstance];

            currentUserMediaRequest.mutex = false;
            if (currentUserMediaRequest.queueRequests.indexOf(options)) {
                delete currentUserMediaRequest.queueRequests[currentUserMediaRequest.queueRequests.indexOf(options)];
                currentUserMediaRequest.queueRequests = removeNullEntries(currentUserMediaRequest.queueRequests);
            }
        }, false);

        currentUserMediaRequest.streams[idInstance] = {
            stream: stream
        };
        currentUserMediaRequest.mutex = false;

        if (currentUserMediaRequest.queueRequests.length) {
            getUserMediaHandler(currentUserMediaRequest.queueRequests.shift());
        }
    }

    if (currentUserMediaRequest.streams[idInstance]) {
        streaming(currentUserMediaRequest.streams[idInstance].stream, true);
    } else {
        var isBlackBerry = !!(/BB10|BlackBerry/i.test(navigator.userAgent || ''));
        if (isBlackBerry || typeof navigator.mediaDevices === 'undefined' || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            navigator.getUserMedia(options.localMediaConstraints, function(stream) {
                stream.streamid = stream.streamid || stream.id || getRandomString();
                stream.idInstance = idInstance;
                streaming(stream);
            }, function(error) {
                options.onLocalMediaError(error, options.localMediaConstraints);
            });
            return;
        }

        if (typeof navigator.mediaDevices === 'undefined') {
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            var getUserMediaSuccess = function() {};
            var getUserMediaFailure = function() {};

            var getUserMediaStream, getUserMediaError;
            navigator.mediaDevices = {
                getUserMedia: function(hints) {
                    navigator.getUserMedia(hints, function(getUserMediaSuccess) {
                        getUserMediaSuccess(stream);
                        getUserMediaStream = stream;
                    }, function(error) {
                        getUserMediaFailure(error);
                        getUserMediaError = error;
                    });

                    return {
                        then: function(successCB) {
                            if (getUserMediaStream) {
                                successCB(getUserMediaStream);
                                return;
                            }

                            getUserMediaSuccess = successCB;

                            return {
                                then: function(failureCB) {
                                    if (getUserMediaError) {
                                        failureCB(getUserMediaError);
                                        return;
                                    }

                                    getUserMediaFailure = failureCB;
                                }
                            }
                        }
                    }
                }
            };
        }

        navigator.mediaDevices.getUserMedia(options.localMediaConstraints).then(function(stream) {
            stream.streamid = stream.streamid || stream.id || getRandomString();
            stream.idInstance = idInstance;

            streaming(stream);
        }).catch(function(error) {
            options.onLocalMediaError(error, options.localMediaConstraints);
        });
    }
}

// StreamsHandler.js

var StreamsHandler = (function() {
    function handleType(type) {
        if (!type) {
            return;
        }

        if (typeof type === 'string' || typeof type === 'undefined') {
            return type;
        }

        if (type.audio && type.video) {
            return null;
        }

        if (type.audio) {
            return 'audio';
        }

        if (type.video) {
            return 'video';
        }

        return;
    }

    function setHandlers(stream, syncAction, connection) {
        if (!stream || !stream.addEventListener) return;

        if (typeof syncAction == 'undefined' || syncAction == true) {
            var streamEndedEvent = 'ended';

            if ('oninactive' in stream) {
                streamEndedEvent = 'inactive';
            }

            stream.addEventListener(streamEndedEvent, function() {
                StreamsHandler.onSyncNeeded(this.streamid, streamEndedEvent);
            }, false);
        }

        stream.mute = function(type, isSyncAction) {
            type = handleType(type);

            if (typeof isSyncAction !== 'undefined') {
                syncAction = isSyncAction;
            }

            if (typeof type == 'undefined' || type == 'audio') {
                stream.getAudioTracks().forEach(function(track) {
                    track.enabled = false;
                    connection.streamEvents[stream.streamid].isAudioMuted = true;
                });
            }

            if (typeof type == 'undefined' || type == 'video') {
                stream.getVideoTracks().forEach(function(track) {
                    track.enabled = false;
                });
            }

            if (typeof syncAction == 'undefined' || syncAction == true) {
                StreamsHandler.onSyncNeeded(stream.streamid, 'mute', type);
            }

            connection.streamEvents[stream.streamid].muteType = type || 'both';

            fireEvent(stream, 'mute', type);
        };

        stream.unmute = function(type, isSyncAction) {
            type = handleType(type);

            if (typeof isSyncAction !== 'undefined') {
                syncAction = isSyncAction;
            }

            graduallyIncreaseVolume();

            if (typeof type == 'undefined' || type == 'audio') {
                stream.getAudioTracks().forEach(function(track) {
                    track.enabled = true;
                    connection.streamEvents[stream.streamid].isAudioMuted = false;
                });
            }

            if (typeof type == 'undefined' || type == 'video') {
                stream.getVideoTracks().forEach(function(track) {
                    track.enabled = true;
                });

                // make sure that video unmute doesn't affects audio
                if (typeof type !== 'undefined' && type == 'video' && connection.streamEvents[stream.streamid].isAudioMuted) {
                    (function looper(times) {
                        if (!times) {
                            times = 0;
                        }

                        times++;

                        // check until five-seconds
                        if (times < 100 && connection.streamEvents[stream.streamid].isAudioMuted) {
                            stream.mute('audio');

                            setTimeout(function() {
                                looper(times);
                            }, 50);
                        }
                    })();
                }
            }

            if (typeof syncAction == 'undefined' || syncAction == true) {
                StreamsHandler.onSyncNeeded(stream.streamid, 'unmute', type);
            }

            connection.streamEvents[stream.streamid].unmuteType = type || 'both';

            fireEvent(stream, 'unmute', type);
        };

        function graduallyIncreaseVolume() {
            if (!connection.streamEvents[stream.streamid].mediaElement) {
                return;
            }

            var mediaElement = connection.streamEvents[stream.streamid].mediaElement;
            mediaElement.volume = 0;
            afterEach(200, 5, function() {
                try {
                    mediaElement.volume += .20;
                } catch (e) {
                    mediaElement.volume = 1;
                }
            });
        }
    }

    function afterEach(setTimeoutInteval, numberOfTimes, callback, startedTimes) {
        startedTimes = (startedTimes || 0) + 1;
        if (startedTimes >= numberOfTimes) return;

        setTimeout(function() {
            callback();
            afterEach(setTimeoutInteval, numberOfTimes, callback, startedTimes);
        }, setTimeoutInteval);
    }

    return {
        setHandlers: setHandlers,
        onSyncNeeded: function(streamid, action, type) {}
    };
})();

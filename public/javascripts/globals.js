// globals.js

// global variables
var chromeMediaSource = 'screen';
var sourceId;
var screenCallback;

// this method can be used to check if chrome extension is installed & enabled.
function isChromeExtensionAvailable(callback) {
    if (!callback) return;

    if (DetectRTC.browser.name === 'Firefox') return isFirefoxExtensionAvailable(callback);

    if (window.IsAndroidChrome) {
        chromeMediaSource = 'screen';
        callback(true);
        return;
    }

    if (chromeMediaSource == 'desktop') {
        callback(true);
        return;
    }

    // ask extension if it is available
    window.postMessage('are-you-there', '*');

    setTimeout(function() {
        if (chromeMediaSource == 'screen') {
            callback(false);
        } else callback(true);
    }, 2000);
}

function isFirefoxExtensionAvailable(callback) {
    if (!callback) return;

    if (DetectRTC.browser.name !== 'Firefox') return isChromeExtensionAvailable(callback);

    var isFirefoxAddonResponded = false;

    function messageCallback(event) {
        var addonMessage = event.data;

        if (!addonMessage || typeof addonMessage.isScreenCapturingEnabled === 'undefined') return;

        isFirefoxAddonResponded = true;

        if (addonMessage.isScreenCapturingEnabled === true) {
            callback(true);
        } else {
            callback(false);
        }

        window.removeEventListener("message", messageCallback, false);
    }

    window.addEventListener("message", messageCallback, false);

    window.postMessage({
        checkIfScreenCapturingEnabled: true,
        domains: [document.domain]
    }, "*");

    setTimeout(function() {
        if (!isFirefoxAddonResponded) {
            callback(true); // can be old firefox extension
        }
    }, 2000); // wait 2-seconds-- todo: is this enough limit?
}

// this function can be used to get "source-id" from the extension
function getSourceId(callback, audioPlusTab) {
    if (!callback) throw '"callback" parameter is mandatory.';
    if (sourceId) {
        callback(sourceId);
        sourceId = null;
        return;
    }

    screenCallback = callback;

    if (!!audioPlusTab) {
        window.postMessage('audio-plus-tab', '*');
        return;
    }
    window.postMessage('get-sourceId', '*');
}

function getChromeExtensionStatus(extensionid, callback) {
    if (window.IsAndroidChrome) {
        chromeMediaSource = 'screen';
        callback('installed-enabled');
        return;
    }

    if (arguments.length != 2) {
        callback = extensionid;
        extensionid = window.RMCExtensionID || 'ajhifddimkapgcifgcodmmfdlknahffk'; // default extension-id
    }

    if (DetectRTC.browser.name === 'Firefox') return callback('not-chrome');

    var image = document.createElement('img');
    image.src = 'chrome-extension://' + extensionid + '/icon.png';
    image.onload = function() {
        sourceId = null;
        chromeMediaSource = 'screen';
        window.postMessage('are-you-there', '*');
        setTimeout(function() {
            if (chromeMediaSource == 'screen') {
                callback(extensionid == extensionid ? 'installed-enabled' : 'installed-disabled');
            } else callback('installed-enabled');
        }, 2000);
    };
    image.onerror = function() {
        callback('not-installed');
    };
}

function getAspectRatio(w, h) {
    function gcd(a, b) {
        return (b == 0) ? a : gcd(b, a % b);
    }
    var r = gcd(w, h);
    return (w / r) / (h / r);
}

// this function explains how to use above methods/objects
function getScreenConstraints(callback, audioPlusTab) {
    var firefoxScreenConstraints = {
        mozMediaSource: 'window',
        mediaSource: 'window'
    };

    if (DetectRTC.browser.name === 'Firefox') return callback(null, firefoxScreenConstraints);

    // support recapture again & again
    sourceId = null;

    isChromeExtensionAvailable(function(isAvailable) {
        // this statement defines getUserMedia constraints
        // that will be used to capture content of screen
        var screen_constraints = {
            mandatory: {
                chromeMediaSource: chromeMediaSource,
                maxWidth: screen.width,
                maxHeight: screen.height,
                minWidth: screen.width,
                minHeight: screen.height,
                minAspectRatio: getAspectRatio(screen.width, screen.height),
                maxAspectRatio: getAspectRatio(screen.width, screen.height),
                minFrameRate: 64,
                maxFrameRate: 128
            },
            optional: []
        };

        if (window.IsAndroidChrome) {
            // now invoking native getUserMedia API
            callback(null, screen_constraints);
            return;
        }

        // this statement verifies chrome extension availability
        // if installed and available then it will invoke extension API
        // otherwise it will fallback to command-line based screen capturing API
        if (chromeMediaSource == 'desktop' && !sourceId) {
            getSourceId(function() {
                screen_constraints.mandatory.chromeMediaSourceId = sourceId;
                callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
                sourceId = null;
            }, audioPlusTab);
            return;
        }

        // this statement sets gets 'sourceId" and sets "chromeMediaSourceId"
        if (chromeMediaSource == 'desktop') {
            screen_constraints.mandatory.chromeMediaSourceId = sourceId;
        }

        sourceId = null;
        chromeMediaSource = 'screen'; // maybe this line is redundant?
        screenCallback = null;

        // now invoking native getUserMedia API
        callback(null, screen_constraints);
    });
}


if (typeof cordova !== 'undefined') {
    DetectRTC.isMobileDevice = true;
    DetectRTC.browser.name = 'Chrome';
}

if (navigator && navigator.userAgent && navigator.userAgent.indexOf('Crosswalk') !== -1) {
    DetectRTC.isMobileDevice = true;
    DetectRTC.browser.name = 'Chrome';
}

function fireEvent(obj, eventName, args) {
    if (typeof CustomEvent === 'undefined') {
        return;
    }

    var eventDetail = {
        arguments: args,
        __exposedProps__: args
    };

    var event = new CustomEvent(eventName, eventDetail);
    obj.dispatchEvent(event);
}

function setHarkEvents(connection, streamEvent) {
    if (!connection || !streamEvent) {
        throw 'Both arguments are required.';
    }

    if (!connection.onspeaking || !connection.onsilence) {
        return;
    }

    if (typeof hark === 'undefined') {
        throw 'hark.js not found.';
    }

    hark(streamEvent.stream, {
        onspeaking: function() {
            connection.onspeaking(streamEvent);
        },
        onsilence: function() {
            connection.onsilence(streamEvent);
        },
        onvolumechange: function(volume, threshold) {
            if (!connection.onvolumechange) {
                return;
            }
            connection.onvolumechange(merge({
                volume: volume,
                threshold: threshold
            }, streamEvent));
        }
    });
}

function setMuteHandlers(connection, streamEvent) {
    if (!streamEvent.stream || !streamEvent.stream || !streamEvent.stream.addEventListener) return;

    streamEvent.stream.addEventListener('mute', function(event) {
        event = connection.streamEvents[streamEvent.streamid];

        event.session = {
            audio: event.muteType === 'audio',
            video: event.muteType === 'video'
        };

        connection.onmute(event);
    }, false);

    streamEvent.stream.addEventListener('unmute', function(event) {
        event = connection.streamEvents[streamEvent.streamid];

        event.session = {
            audio: event.unmuteType === 'audio',
            video: event.unmuteType === 'video'
        };

        connection.onunmute(event);
    }, false);
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

// Get HTMLAudioElement/HTMLVideoElement accordingly

function getRMCMediaElement(stream, callback, connection) {
    if (!connection.autoCreateMediaElement) {
        callback({});
        return;
    }

    var isAudioOnly = false;
    if (!!stream.getVideoTracks && !stream.getVideoTracks().length && !stream.isVideo && !stream.isScreen) {
        isAudioOnly = true;
    }

    if (DetectRTC.browser.name === 'Firefox') {
        if (connection.session.video || connection.session.screen) {
            isAudioOnly = false;
        }
    }

    var mediaElement = document.createElement(isAudioOnly ? 'audio' : 'video');

    mediaElement.srcObject = stream;
    mediaElement.controls = true;

    // http://goo.gl/WZ5nFl
    // Firefox don't yet support onended for any stream (remote/local)
    if (DetectRTC.browser.name === 'Firefox') {
        var streamEndedEvent = 'ended';

        if ('oninactive' in mediaElement) {
            streamEndedEvent = 'inactive';
        }

        mediaElement.addEventListener(streamEndedEvent, function() {
            // fireEvent(stream, streamEndedEvent, stream);
            currentUserMediaRequest.remove(stream.idInstance);

            if (stream.type === 'local') {
                streamEndedEvent = 'ended';

                if ('oninactive' in stream) {
                    streamEndedEvent = 'inactive';
                }

                StreamsHandler.onSyncNeeded(stream.streamid, streamEndedEvent);

                connection.attachStreams.forEach(function(aStream, idx) {
                    if (stream.streamid === aStream.streamid) {
                        delete connection.attachStreams[idx];
                    }
                });

                var newStreamsArray = [];
                connection.attachStreams.forEach(function(aStream) {
                    if (aStream) {
                        newStreamsArray.push(aStream);
                    }
                });
                connection.attachStreams = newStreamsArray;

                var streamEvent = connection.streamEvents[stream.streamid];

                if (streamEvent) {
                    connection.onstreamended(streamEvent);
                    return;
                }
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            }
        }, false);
    }

    var played = mediaElement.play();
    if (typeof played !== 'undefined') {
        var cbFired = false;
        setTimeout(function() {
            if (!cbFired) {
                cbFired = true;
                callback(mediaElement);
            }
        }, 1000);
        played.then(function() {
            if (cbFired) return;
            cbFired = true;
            callback(mediaElement);
        }).catch(function(error) {
            if (cbFired) return;
            cbFired = true;
            callback(mediaElement);
        });
    } else {
        callback(mediaElement);
    }
}

// if IE
if (!window.addEventListener) {
    window.addEventListener = function(el, eventName, eventHandler) {
        if (!el.attachEvent) {
            return;
        }
        el.attachEvent('on' + eventName, eventHandler);
    };
}

function listenEventHandler(eventName, eventHandler) {
    window.removeEventListener(eventName, eventHandler);
    window.addEventListener(eventName, eventHandler, false);
}

window.attachEventListener = function(video, type, listener, useCapture) {
    video.addEventListener(type, listener, useCapture);
};

function removeNullEntries(array) {
    var newArray = [];
    array.forEach(function(item) {
        if (item) {
            newArray.push(item);
        }
    });
    return newArray;
}


function isData(session) {
    return !session.audio && !session.video && !session.screen && session.data;
}

function isNull(obj) {
    return typeof obj === 'undefined';
}

function isString(obj) {
    return typeof obj === 'string';
}

var MediaStream = window.MediaStream;

if (typeof MediaStream === 'undefined' && typeof webkitMediaStream !== 'undefined') {
    MediaStream = webkitMediaStream;
}

/*global MediaStream:true */
if (typeof MediaStream !== 'undefined') {
    if (!('getVideoTracks' in MediaStream.prototype) || DetectRTC.browser.name === 'Firefox') {
        MediaStream.prototype.getVideoTracks = function() {
            if (!this.getTracks) {
                return [];
            }

            var tracks = [];
            this.getTracks().forEach(function(track) {
                if (track.kind.toString().indexOf('video') !== -1) {
                    tracks.push(track);
                }
            });
            return tracks;
        };

        MediaStream.prototype.getAudioTracks = function() {
            if (!this.getTracks) {
                return [];
            }

            var tracks = [];
            this.getTracks().forEach(function(track) {
                if (track.kind.toString().indexOf('audio') !== -1) {
                    tracks.push(track);
                }
            });
            return tracks;
        };
    }

    if (!('stop' in MediaStream.prototype) || DetectRTC.browser.name === 'Firefox') {
        MediaStream.prototype.stop = function() {
            this.getAudioTracks().forEach(function(track) {
                if (!!track.stop) {
                    track.stop();
                }
            });

            this.getVideoTracks().forEach(function(track) {
                if (!!track.stop) {
                    track.stop();
                }
            });
        };
    }
}

function isAudioPlusTab(connection, audioPlusTab) {
    if (connection.session.audio && connection.session.audio === 'two-way') {
        return false;
    }

    if (DetectRTC.browser.name === 'Firefox' && audioPlusTab !== false) {
        return true;
    }

    if (DetectRTC.browser.name !== 'Chrome' || DetectRTC.browser.version < 50) return false;

    if (typeof audioPlusTab === true) {
        return true;
    }

    if (typeof audioPlusTab === 'undefined' && connection.session.audio && connection.session.screen && !connection.session.video) {
        audioPlusTab = true;
        return true;
    }

    return false;
}

function getAudioScreenConstraints(screen_constraints) {
    if (DetectRTC.browser.name === 'Firefox') {
        return true;
    }

    if (DetectRTC.browser.name !== 'Chrome') return false;

    return {
        mandatory: {
            chromeMediaSource: screen_constraints.mandatory.chromeMediaSource,
            chromeMediaSourceId: screen_constraints.mandatory.chromeMediaSourceId
        }
    };
}

window.iOSDefaultAudioOutputDevice = window.iOSDefaultAudioOutputDevice || 'speaker'; // earpiece or speaker

if (typeof window.enableAdapter === 'undefined') {
    if (DetectRTC.browser.name === 'Firefox' && DetectRTC.browser.version >= 54) {
        window.enableAdapter = true;
    }

    if (DetectRTC.browser.name === 'Chrome' && DetectRTC.browser.version >= 60) {
        // window.enableAdapter = true;
    }

    if (typeof adapter !== 'undefined' && adapter.browserDetails && typeof adapter.browserDetails.browser === 'string') {
        window.enableAdapter = true;
    }
}

if (!window.enableAdapter) {
    if (typeof URL.createObjectURL === 'undefined') {
        URL.createObjectURL = function(stream) {
            return 'blob:https://' + document.domain + '/' + getRandomString();
        };
    }

    if (!('srcObject' in HTMLMediaElement.prototype)) {
        HTMLMediaElement.prototype.srcObject = function(stream) {
            if ('mozSrcObject' in this) {
                this.mozSrcObject = stream;
                return;
            }

            this.src = URL.createObjectURL(stream);
        };
    }

    // need RTCPeerConnection shim here
}

(function (window) {

    var buffer = '';
    var size = 0;
    var start = new Date().getTime();
    var fileName = '';
    var totalSize = 0;
    var capturedSize = 0;
    var recording = false;

    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true}, success, function (e) {
            alert('Error capturing audio.');
        });
    } else {
        alert('getUserMedia not supported in this browser.');
    }

    function addRecordLinkElement(link) {
        document.getElementById("records").innerHTML = document.getElementById("records").innerHTML +
        '<div><a href="' + link + '">' + link + '</a></div>';
    }
    function updateStatus(){
        var duration = ((new Date().getTime()) - start) / 1000;
        document.getElementById("status").innerHTML =
            " <b>file: </b> " + fileName +
            " <b>duration: </b>" + duration + 'sec.' +
            " <b>upload data: </b>" + totalSize/1000 + 'k' +
            " <b>captured data: </b>" + capturedSize/1000 + 'k' ;
    }
    function getNextRecordName(cb){
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState == 4 && request.status == 200) {
                cb(request.responseText);
            }
        };
        request.open('GET', 'startRecord');
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send();
    }
    function stopRecord(cb){
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState == 4 && request.status == 200) {
                cb(request.responseText);
            }
        };
        request.open('GET', 'stopRecord');
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send();
    }

    document.getElementById("body").onload = function () {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState == 4 && request.status == 200) {
                links = JSON.parse(request.responseText);
                console.log(links);
                links.forEach(function (link) {
                    addRecordLinkElement('records/' + link);
                });
            }
        };
        request.open('GET', 'records');
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send();
    };

    document.getElementById("start").onclick = function () {
        if(!recording) {
            buffer = '';
            start = new Date().getTime();
            totalSize = 0;
            capturedSize = 0;
            getNextRecordName(function (nextFileName) {
                fileName = nextFileName;
                recording = true;
            });
        }
    };

    document.getElementById("stop").onclick = function () {
        if(recording){
            stopRecord(function(){
                addRecordLinkElement(fileName);
            });
        }
        recording = false;
    };

    function success(e) {
        var audioContext = window.AudioContext || window.webkitAudioContext;
        var context = new audioContext();

        // the sample rate is in context.sampleRate
        var audioInput = context.createMediaStreamSource(e);

        var bufferSize = 2048;
        var recorder = context.createScriptProcessor(bufferSize, 1, 1);

        recorder.onaudioprocess = function (e) {
            if (!recording) return;
            console.log('recording');
            var left = e.inputBuffer.getChannelData(0);
            size = size + left.length;

            var convertedBuffer = _arrayBufferToBase64S(convertoFloat32ToInt16(left));
            buffer = buffer + convertedBuffer;
            totalSize = totalSize + convertedBuffer.length;
            capturedSize = capturedSize + left.length;
            if (size > 10000) {
                pushToServer(buffer);
                buffer = '';
                size = 0;
            }

            updateStatus();
        };

        audioInput.connect(recorder);
        recorder.connect(context.destination);
    }

    function convertoFloat32ToInt16(b) {
        var l = b.length;
        var buf = new Int16Array(l);

        while (l--) {
            buf[l] = b[l] * 0xFFFF;    //convert to 16 bit
        }
        return buf.buffer
    }

    function _arrayBufferToBase64S(bu) {
        var binary = '';
        var bytes = new Uint8Array(bu);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return binary;
    }

    function pushToServer(data) {
        console.log('pushed to server');
        var request = new XMLHttpRequest();

        request.onreadystatechange = function () {
            console.log(JSON.stringify(request));
            if (request.readyState == 4 && request.status == 200) {
                //count errors?
            }
        };
        request.open('POST', 'upload');
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify({
            fileName: fileName,
            data: window.btoa(data)
        }));
    }
})(this);

(function (window) {

    var buffer = '';
    var start = new Date().getTime();
    var fileName = '';
    var totalSize = 0;
    var capturedSize = 0;
    var recording = false;
    var mediaRecorder;
    var onProgressInterval;

    function addRecord(record) {
        var li = document.createElement('li');
        var h = "onRemove('" + record.file + "')"; //hack
        //h.replace(/\//, '//');
        var name = record.file + ' (' + record.size/1000 + 'k)';
        li.innerHTML = '<li id="' + record.file + '"><a href="' + record.file + '" target="_blank">play: ' + name + '</a> <button onclick="' + h + '">remove</button> </li>';
        document.getElementById("records").appendChild(li);
    }

    window.onRemove = function (link) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState == 4 && request.status == 200) {
                removeRecord(link)
            }
        };
        request.open('POST', 'delete-record');
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send(JSON.stringify({file:link}));
    };
    function removeRecord(link) {
        var item = document.getElementById(link).parentNode; //this is hack
        item.parentNode.removeChild(item);
    }

    function updateStatus() {
        var duration = ((new Date().getTime()) - start) / 1000;
        document.getElementById("status").innerHTML =
            " <b>file: </b> " + fileName +
            " <b>duration: </b>" + duration + 'sec.' +
            " <b>upload data: </b>" + totalSize / 1000 + 'k';
    }

    function getNextRecordName(cb) {
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

    function stopRecord(cb) {
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

    function onProgress(){
        mediaRecorder.requestData();
        // makes snapshot available of data so far
        // ondataavailable fires, then capturing continues
        // in new Blob
        updateStatus();
    }

    document.getElementById("body").onload = function () {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState == 4 && request.status == 200) {
                records = JSON.parse(request.responseText);
                console.log(records);
                records.forEach(function (record) {
                    addRecord(record);
                });
            }
        };
        request.open('GET', 'records');
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.send();
    };

    document.getElementById("start").onclick = function () {
        if (!recording) {
            buffer = '';
            start = new Date().getTime();
            totalSize = 0;
            capturedSize = 0;
            getNextRecordName(function (nextFileName) {
                fileName = nextFileName;
                recording = true;
                // void start(optional long mTimeSlice)
                // The interval of passing encoded data from EncodedBufferCache to onDataAvailable
                // handler. "mTimeSlice < 0" means Session object does not push encoded data to
                // onDataAvailable, instead, it passive wait the client side pull encoded data
                // by calling requestData API.
                mediaRecorder.start(0);

                onProgressInterval = setInterval(onProgress, 1000);
                updateStatus();
            });
        }
    };

    document.getElementById("stop").onclick = function () {
        if (recording) {
            stopRecord(function () {
                mediaRecorder.stop();
                addRecord({file: fileName, size:totalSize});
            });
            clearInterval(onProgressInterval);
        }
        recording = false;
    };

    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true}, success, function (e) {
            alert('Error capturing audio.');
        });
    } else {
        alert('getUserMedia not supported in this browser.');
    }

    function success(e) {
        //https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder.state
        mediaRecorder = new window.MediaRecorder(e);

        // Dispatching OnDataAvailable Handler
        mediaRecorder.ondataavailable = function (e) {
            if (!e.data.size) {
                console.warn('Recording of', e.data.type, 'failed.');
                return;
            }

            /**
             * @property {Blob} blob - Recorded frames in video/webm blob.
             * @memberof MediaStreamRecorder
             * @example
             * recorder.stop(function() {
                 *     var blob = recorder.blob;
                 * });
             */
            var blob = new Blob([e.data], {
                type: e.data.type || self.mimeType || 'audio/ogg'
            });

            //self.callback();
            var reader = new window.FileReader();
            reader.readAsDataURL(e.data);
            reader.onloadend = function () {
                base64data = reader.result;
                pushToServer(base64data);

                //console.log(base64data );
            }

        };

        mediaRecorder.onerror = function (error) {
            console.warn(error);
            mediaRecorder.stop();
        };


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
            data: data.replace(/data:audio\/ogg;base64,/, '') //window.btoa(data)
        }));
        totalSize = totalSize + data.length;
    }
})(this);

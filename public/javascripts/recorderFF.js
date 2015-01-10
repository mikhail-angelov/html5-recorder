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
        li.setAttribute("id", record.file);
        var handler = "onRemove('" + record.file + "')"; //hack
        var name = record.file + ' (' + record.size/1000 + 'k)';
        li.innerHTML = '<a href="' + record.file + '" target="_blank">' + name + '</a> <button onclick="' + handler + '">remove</button>';
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
        var item = document.getElementById(link);
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

    //https://github.com/mdn/web-dictaphone

    var soundClips = document.querySelector('.sound-clips');
    var canvas = document.querySelector('.visualizer');

    var audioCtx = new (window.AudioContext || webkitAudioContext)();
    var canvasCtx = canvas.getContext("2d");


    function success(stream) {
        //https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder.state
        mediaRecorder = new window.MediaRecorder(stream);

        visualize(stream);

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

    function visualize(stream) {
        var source = audioCtx.createMediaStreamSource(stream);

        var analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);
        //analyser.connect(audioCtx.destination);

        WIDTH = canvas.width;
        HEIGHT = canvas.height;

        draw();

        function draw() {

            requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = 'rgb(230, 230, 230)';
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = 'rgb(0, 55, 204)';

            canvasCtx.beginPath();

            var sliceWidth = WIDTH * 1.0 / bufferLength;
            var x = 0;


            for(var i = 0; i < bufferLength; i++) {

                var v = dataArray[i] / 128.0;
                var y = v * HEIGHT/2;

                if(i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height/2);
            canvasCtx.stroke();

        }
    }
})(this);

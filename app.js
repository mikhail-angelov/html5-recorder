//I use some code from http://blog.groupbuddies.com/posts/39-tutorial-html-audio-capture-streaming-to-node-js-no-browser-extensions

var express = require('express');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var BinaryServer = require('binaryjs').BinaryServer;
var fs = require('fs');
var wav = require('wav');
var multipart = require("multipart");
var sys = require("sys");
var recordCount = 0;
var recordName = 'records/record0.ogg';

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use("/", express.static(__dirname + '/index.html'));

var port = 8080;
var fileWriter;

app.use(bodyParser.json());


function getNewRecordName(){
    while(fs.existsSync('public/'+recordName)){
        recordCount++;
        recordName = 'records/record'+recordCount+'.ogg';
    }
    return recordName;
}

app.get('/records', function(req, res){
    console.log("records");
    res.writeHead(200);
    var files = fs.readdirSync('public/records');
    var records = [];
    files.forEach(function(file){
        var stats = fs.statSync('public/records/' + file);
        records.push({file: 'records/' + file, size: stats["size"]});
    });
    recordCount = records.length;
    res.end(JSON.stringify(records));
});

app.get('/startRecord', function(req, res){
    console.log("start record");
    res.writeHead(200);
    recordName = getNewRecordName();
    //if(!fileWriter) {
    //    fileWriter = new wav.FileWriter('public/' + recordName, {
    //        channels: 1,
    //        sampleRate: 44100,
    //        bitDepth: 16
    //    });
    //}
    res.end(recordName);
});

app.get('/stopRecord', function(req, res){
    console.log("stop record");
    //if(fileWriter){
    //    fileWriter.end();
    //    fileWriter = null;
    //}
    res.writeHead(200);
    res.end(recordName);
});

app.post('/upload', function(req, res){
    console.log("putted");
    res.writeHead(200);
    var fileName = 'public/'+recordName;
    res.end(recordName);

    fs.appendFile(fileName, req.body.data, 'base64',  function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("The file was updated!");
        }
    });
    //fileWriter.write(req.body.data, 'base64'); //for wav streaming

});

app.post('/delete-record',function(req, res){
    console.log("delete " + req.body);
    res.writeHead(200);
    var fileName = 'public/'+req.body.file;
    fs.unlinkSync(fileName); //handle errors
    res.end('OK');
});

app.listen(port);



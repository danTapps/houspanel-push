"use strict";

process.title = 'houspanel-push';

// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');
const fs = require('fs');

// Load config
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

/**
 * Global variables
 */
// list of currently connected clients (users)
var clients = [ ];

var elements;
/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updateElements() {
    elements = null;
    console.log('do request');
    const request = require('request');
    request.post({url:config.housepanel_url, form:{useajax:'doquery',id:'all',type:'all',value:'none',attr:'none',hubnum:'0'}}, function (error, response, body) {
    if (error != null)
    {
      console.log('error:', error); // Print the error if one occurred
      return;
    }
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    if (response.statusCode != 200)
    {
        return;
    }
    elements = JSON.parse(body);
});

}

updateElements();
setInterval(function(){
    updateElements();
}
, 10*60*1000);

var app = require('express')();
var bodyParser = require('body-parser');


app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get("/", function (req, res) {
    res.send("GET request");
});

app.post("/", function (req, res) {
    console.log(req.body);
    res.json('thanks');
    if (elements == null)
        return;
    elements.forEach(function(entry) {
        if (entry['id'] == req.body['change_device'])
        {
            console.log('---> ');
            console.log(entry);
            entry['value'][req.body['change_attribute']] = req.body['change_value'];
            console.log('<--- ');
            console.log(entry);
                for (var i=0; i < clients.length; i++) {
                    clients[i].sendUTF(JSON.stringify(elements));
                }
        }
    });

});

app.listen(config.port, function () {
    console.log("Server is running on port: " + config.port);
});

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
});
server.listen(config.webSocketServerPort, function() {
    console.log((new Date()) + " Server is listening on port " + config.webSocketServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    // accept connection - you should check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin); 
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
    var userName = false;
    var userColor = false;

    console.log((new Date()) + ' Connection accepted.');

    if (elements != null)
        connection.sendUTF(JSON.stringify(elements));
    // user sent some message
    connection.on('message', function(message) {
    });

    // user disconnected
    connection.on('close', function(connection) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected.");
            // remove user from the list of connected clients
            clients.splice(index, 1);
    });

});

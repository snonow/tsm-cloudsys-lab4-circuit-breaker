// A mock webserver that is able to simulate overload.
// Intended to be used to test a Circuit Breaker.
// 
// Endpoints:
// / for regular service requests
// /alive for Kubernetes health checks
// /ready for Circuit Breaker health checks
// /fakeerrormodeon send a POST to turn on overload mode
// /fakeerrormodeon send a POST to turn off overload mode

'use strict';

const express = require('express');

var ready = false;
console.log('Container is not yet ready.');

const PORT = 80;
const HOST = '0.0.0.0';
const app = express();

// When this flag is enabled we simulate an overloaded service
var fakeAnError = false;

// We provide the /alive endpoint so that Kubernetes can check the
// container's health. For its liveness probe Kubernetes expects a 200
// OK response from the endpoint, otherwise it will kill and recreate
// the container.
app.get('/alive', (req, res) => {

    console.log('/alive');

    res.status(200).send('OK');
});

// We provide the /ready endpoint so that NGINX configured as Circuit
// Breaker is able to check that we are in good health.
app.get('/ready', (req, res) => {

    console.log('/ready');

    // If we are in error mode, we'll just return a 503
    if (fakeAnError) {
        res.status(503).send('BUSY FROM ' + req.connection.localAddress);
    } else
        if (!ready) {
            res.status(503).send('BUSY FROM ' + req.connection.localAddress);
        } else {
            res.status(200).send('OK FROM ' + req.connection.localAddress);
        }
});

// This is our main endpoint. In normal operation we return 200 OK.
// In failure mode we delay the response and return 503 Service Unavailable
app.get('/', (req, res) => {

    console.log('/');

    if (!fakeAnError) {
        res.status(200).send('SOMERESPONSE FROM ' + req.connection.localAddress);
    } else {
        // Have a non-blocking 30s delay in the response of this endpoint
        setTimeout(() => {
            res.status(503).send('ERROR FROM ' + req.connection.localAddress);
        }, 30000);
    }

});

// These two endpoints will toggle the "fakeerror" mode on/off for subsequent requests
app.post('/fakeerrormodeon', (req, res) => {

    console.log('/fakeerrormodeon');

    fakeAnError = true;
    res.status(200).send('OK FROM ' + req.connection.localAddress);
});
app.post('/fakeerrormodeoff', (req, res) => {

    console.log('/fakeerrormodeoff');

    fakeAnError = false;
    res.status(200).send('OK FROM ' + req.connection.localAddress);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

// All is done? Then mark this server ready
ready = true;


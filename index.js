
var express = require('express')
    , http = require('http')
    , bodyParser = require('body-parser')
    , fs = require("fs")
    , app = express()
    , http_port = 3001
    , Datastore = require('nedb') //base de donnees fichiers
    , path = require('path')
    , join = require("path").join
    , nedb = require('nedb')
    , child_process = require("child_process")
    , request = require('request');

var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file    
var morgan = require('morgan'); // Traces 
var STORAGE_DIR = "./storage";


console.log("__dirname = " + __dirname);
/**
 *INITIALISATION d'EXPRESS
 *  
 **/
app.set('superSecret', config.secret); // secret variable    
//Répertoire exposé au public
app.use(express.static(path.join(__dirname, 'public')));

//app.set('superSecret', config.secret); // secret variable

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

console.log("express static " + __dirname + './public');

// use morgan to log requests to the console
app.use(morgan('dev'));

app.options("/*", function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.send(200);
});

/**
 * INITIALISATION DES ROUTES ASSOCIEE A LEUR BASE DE DONNEES
 * 
 */
//var dbCourses = new Datastore({ filename: STORAGE_DIR+"/courses", autoload: true});
var dbUser = new Datastore({ filename: STORAGE_DIR + "/users", autoload: true });



//a executer une fois pour initialiser la table dbUser

dbUser.find({ name: "domobox" }, function (err, user) {
    if (err) throw err;
    if (user.length === 0) {
        var toto = {};
        toto.name = "domobox";
        toto.password = "domoboxpw";
        toto.profile = "admin";
        dbUser.insert(toto, function (err, newDoc) {
            console.log("users inserted");
        });
    }
});


// =======================
// routes ================
// =======================


// API ROUTES -------------------
// we'll get to these in a second
// get an instance of the router for api routes
var apiRoutes = express.Router();

app.use(function (req, res, next) {
    if (req.headers.origin) {
        res.header('Access-Control-Allow-Origin', '*')
        //res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization')
        res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE,OPTIONS')
    }

    console.debug("check authentificate " + req.method);
    var authHeader = req.headers.authorization;
    if (!authHeader) {
        var err = new Error("you are not authorization");
        err.status = 401;
        next(err);
        return;
    }
    console.debug('authHeader :' + authHeader + " split " + authHeader.split(' ')[1]);

    var auth = new Buffer(authHeader.split(' ')[1], 'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];
    console.debug("user=" + user + " pass=" + pass);
    dbUser.find({ name: user }, function (err, user) {
        if (err) throw err;
        if (user.length === 0) {
            //console.log("user =" + JSON.stringify(user));
            res.json({ success: false, message: 'Authentication failed. User not found.' });
        } else if (user[0]) {
            // check if password matches
            //console.log("user =" + JSON.stringify(user[0]));
            if (user[0].password != pass) {
                res.json({ success: false, message: 'Authentication failed. Wrong password.' });
            } else {
                next();
            }
        }
    });
});


/**
 * Call connected object to get the programmation
 */
app.get('/api/piscine/programmation', function (req, res) {

    request({
        uri: config.piscineHost+"/get/piscine/programmation",
        method: "GET",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
    }, function (error, response, body) {
        if (error) {
            console.error("GET /api/piscine/programmation ERROR : " + error)
        } else {
            console.log("GET /api/piscine/programmation =>" + body);
            res.send(body)
        }
    });
});

/**
 * Post programmation to the connected object
 */
app.post('/api/piscine/programmation', function (req, res) {
    var prog = req.body;
    request({
        uri: config.piscineHost+"/post/piscine/programmation",
        method: "POST",
        form: {
            programmation: req.body.programmation,
            mode:req.body.mode,
            hour:new Date().getHours(),
            minute: new Date().getMinutes(),
            token:"cyspeo-iot"
          }       
    }, function (error, response, body) {
        if (error) {
            console.error("POST /api/piscine/programmation ERROR : " + error)
        } else {
            console.log("POST /api/piscine/programmation =>" + body);
            res.send("")
        }
    });
});

/**
 * Post time to the connected object
 * This request will be call every hours
 */
var postTime =  function () {
    console.debug("POST time to IOT ");
    var prog = req.body;
    request({
        uri: config.piscineHost,
        method: "POST",
        form: {
            hour:new Date().getHours(),
            minute: new Date().getMinutes(),
            token:"cyspeo-iot"
          }       
    }, function (error, response, body) {
        if (error) {
            console.error("POST /api/piscine/time ERROR : " + error)
        } else {
            console.log("POST /api/piscine/time =>" + body);
            res.send("")
        }
    });
}

/**
 * 
 * LANCEMENT DU SERVEUR 
 */

setInterval(function() {
    postTime();
},3600000);

app.listen(http_port);
console.log("Server Listening on " + http_port);


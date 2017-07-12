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
    , child_process = require("child_process");

var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file    
var morgan = require('morgan'); // Traces 
var STORAGE_DIR = "../storage";

console.log("__dirname = "+ __dirname);
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
app.use(function (req, res, next) {
    if (req.headers.origin) {
        res.header('Access-Control-Allow-Origin', '*')
        //res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization')
        res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE')
        if (req.method === 'OPTIONS') return res.send(200)
    }
    next()
});

/**
 * INITIALISATION DES ROUTES ASSOCIEE A LEUR BASE DE DONNEES
 * 
 */
//var dbCourses = new Datastore({ filename: STORAGE_DIR+"/courses", autoload: true});
var dbUser = new Datastore({ filename: STORAGE_DIR+"/users", autoload: true });

var toto = {};
toto.name = "toto";
toto.password = "titi";
toto.profile = "user";
/* a executer une fis pour initialiser la table dbUser
dbUser.insert(toto, function (err, newDoc) {   
	console.log("users inserted");
});*/

// =======================
// routes ================
// =======================


// API ROUTES -------------------
// we'll get to these in a second
// get an instance of the router for api routes
var apiRoutes = express.Router();


// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function (req, res) {
    //Find user
    dbUser.find({ name: req.body.name }, function (err, user) {
        if (err) throw err;
        if (user.length === 0) {
            console.log("user =" + JSON.stringify(user));
            res.json({ success: false, message: 'Authentication failed. User not found.' });
        } else if (user[0]) {

            // check if password matches
            console.log("user =" + JSON.stringify(user[0]));
            if (user[0].password != req.body.password) {
                res.json({ success: false, message: 'Authentication failed. Wrong password.' });
            } else {

                // if user is found and password is right
                // create a token
                var token = jwt.sign(user[0], app.get('superSecret'), {
                    //expiresInMinutes: 5 // expires in 5 minutes
                    expiresIn: 1440 * 06 // expires in 24 heures
                });
                // return the information including token as JSON
                res.json({
                    success: true,
                    message: 'Enjoy your token!',
                    token: token
                });
            }

        }

    });
});

// route middleware to verify a token
apiRoutes.use(function (req, res, next) {

    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function (err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });

    } else {

        // if there is no token
        // return an error
        return res.status(403).json({
            success: false,
            message: 'No token provided.'
        });

    }
});


app.get('/api/piscine/programmation', function (req, res) {
    var prog = require("./persistence/pisicne/programmation");
    if (!prog) {
        prog = {};
        prog.plages = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,];
        prog.relais = false;
        fs.writeFileSync(".persistence/piscine/programmation.js",prog);
    }
    res.send(prog);
})

/**
 * 
 * LANCEMENT DU SERVEUR 
 */


app.listen(http_port);
console.log("Server Listening on " + http_port);
console.log("Go to  http://mon serveur:3001/ ");
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
var dbUser = new Datastore({ filename: STORAGE_DIR + "/users", autoload: true });

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

app.use(function (req, res, next) {
    console.log("check authentificate " + req.headers);
    var authHeader = req.headers.authorization;
    if (!authHeader) {
        var err = new Error("you are not authorization");
        err.status = 401;
        next(err);
        return;
    }
    //console.log('authHeader :' + authHeader + " split " + authHeader.split(' ')[1]);

    var auth = new Buffer(authHeader, 'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];
    //console.log("user="+user+" pass="+pass);
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


app.get('/api/piscine/programmation', function (req, res) {
    var prog = {};
    try {
        prog = fs.readFileSync(__dirname + "/persistence/piscine/programmation.js")
    } catch (err) {
        console.log("erro read", JSON.stringify(err));
        if (err.code === 'ENOENT') {
            prog = {plagesHoraires:[],relais:false};
            for (var i = 0; i < 24; i++) {
                prog.plagesHoraires[i] = false;
            };
            prog.relais = false;
            try {
                fs.mkdirp(__dirname + "/persistence/piscine");
                fs.writeFileSync(__dirname + "/persistence/piscine/programmation.js", JSON.stringify(prog) , 'utf-8');
            } catch (err) { throw err; }
        } else {
            console.log("erro read" + err.code);
            throw err;
        }
    }
    console.log("no read");
    res.send(prog);
});

app.post('/api/piscine/programmation', function (req, res) {
    console.log("post prog "+ req.body);
    var prog = req.body;
      try {
                fs.mkdirp(__dirname + "/persistence/piscine");
                fs.writeFileSync(__dirname + "/persistence/piscine/programmation.js", JSON.stringify(prog) , 'utf-8');
            } catch (err) { throw err; }
});

fs.isDir = function (dpath) {
    try {
        return fs.lstatSync(dpath).isDirectory();
    } catch (e) {
        return false;
    }
};
fs.mkdirp = function (dirname) {
    dirname = path.normalize(dirname).split(path.sep);
    dirname.forEach((sdir, index) => {
        var pathInQuestion = dirname.slice(0, index + 1).join(path.sep);
        if ((!fs.isDir(pathInQuestion)) && pathInQuestion) fs.mkdirSync(pathInQuestion);
    });
};


/**
 * 
 * LANCEMENT DU SERVEUR 
 */


app.listen(http_port);
console.log("Server Listening on " + http_port);
console.log("Go to  http://mon serveur:3001/ ");
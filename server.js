/**
 * Created by megatron on 6/23/15.
 */

// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var mysql      = require('mysql');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 2020;        // set our port


// MYSQL CONNECTION
// =============================================================================

//var connection = mysql.createConnection({
//    host     : 'localhost',
//    user     : 'coy',
//    password : 'fishes',
//    database : 'coyfish'
//});

var pool      =    mysql.createPool({
    connectionLimit : 100, //important
    host     : 'localhost',
    user     : 'coy',
    password : 'fishes',
    database : 'coyfish',
    debug    :  false
});

function handle_database(req, res, reqtype) {
    var sql;

    switch(reqtype) {
        case "add":
            var selector = req.body.fishname;
            sql = "INSERT INTO fish(fishname, fishhash, last_modified_date) VALUES('" + selector + "', sha1('" + selector + "'), now());";
            break;
        case "find":
            sql = "SELECT * FROM fish WHERE fishhash = sha1('" + req.params.selector + "')";
            break;
        case "delete":
            sql = "DELETE FROM fish WHERE id = " + req.params.selector;
            break;
        case "update":
            var newSelector = req.body.fishname;
            sql = "UPDATE fish SET fishname = '" + newSelector + "', fishhash = sha1('" + newSelector + "'), last_modified_date = now() WHERE id=" + req.params.selector;
            break;
        default:
            sql = "SELECT * FROM fish"
    }


    pool.getConnection(function(err,connection){
        if (err) {
            connection.release();
            res.json({"code" : 100, "status" : "Error in connection database"});
            return;
        }
        console.log('connected as id ' + connection.threadId);

        connection.query(sql,function(err,rows){
            connection.release();
            if(!err) {
                switch(reqtype) {
                    case "add":
                        res.end(rows.affectedRows + " row(s) have been inserted.");
                        break;
                    case "find":
                        if (rows.length > 0) {
                            res.end('true');
                        } else {
                            res.end('false');
                        }
                        break;
                    case "update":
                        res.end(rows.affectedRows + " row(s) have been updated.");
                        break;
                    case "delete":
                        res.end(rows.affectedRows + " row(s) have been deleted.");
                    default:
                        res.json(rows);
                }

                res.json(rows);
            } else {
                res.json(err);
            }
        });

        connection.on('error', function(err) {
            res.json({"code" : 100, "status" : "Error in connection database"});
            return;
        });
    });
}

var router = express.Router();              // get an instance of the express Router

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    handle_database(req,res);
    //res.json({ message: 'hooray! welcome to our api!' });
});

// more routes for our API will happen here

router.route('/remora')
    // create a bear (accessed at POST http://localhost:8080/api/bears)
    .post(function(req, res) {
        if (req.body.fishname) {
            handle_database(req,res, "add");
        } else {
            res.end("No selector added!");
        }
    })

    .get(function(req, res) {
        handle_database(req,res);
    });

router.route('/remora/:selector')

    // get the fish with that name
    .get(function(req, res) {
        if (req.params.selector) {
            handle_database(req, res, "find");
        } else {
            res.end("No selector provided.");
        }
    })
    // update the fish with this id
    .put(function(req, res) {
        if (req.params.selector) {
            handle_database(req, res, "update");
        } else {
            res.end("New selector not provided.");
        }

    })

    // delete the fish with this id
    .delete(function(req, res) {
        if (req.params.selector) {
            handle_database(req, res, "delete");
        } else {
            res.end("ID required for delete.");
        }
    });


// REGISTER OUR ROUTES -------------------------------
// prefix of routes if any
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
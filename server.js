const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path')
const crud = require("./lib/crud");
const bodyParser = require("body-parser");
const urlExists = require('url-exists');
const exec = require('child_process').exec;
const ejs = require('ejs');
const getmac = require('getmac');
const md5 = require('md5');
let serverName = "mz.tv"

let MOVIEDATA = {
    id: "",
    image: "",
    name: "",
    status: "",
    duration: 0,
    progress: 0
}


//setting middleware
app.use(express.static('public'))
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/public/views/'));

// IO to shutdown the mz server 
app.post('/shutdown', function (req, res) {
    shutdown(function (output) {
        res.send("bye");
    });

});

// IO to shutdown the mz server 
app.post('/restart', function (req, res) {
    reboot(function (output) {
        res.send("bye");
    });
});

// IO to shutdown the mz server 
app.post('/update-code', function (req, res) {
    update(function (output) {
        res.send("bye");
    });
});

//this only refreshes the movies section 
app.post('/refresh-db', function (req, res) {
    let jsonListPath = req.body.JsonListPath;
    let newdata = {};
    newdata.JsonListUpdated = new Date().toLocaleString();
    crud.updateMovieList(jsonListPath).then(function (data) {
        crud.saveConfig(newdata);
        res.send(data);
    }).catch(function (error){
        res.status(400).send('Error');
    });
});

// this is where we will play the movie
app.get('/player', function (req, res) {
    res.sendFile(__dirname + '/public/tv_player.html');
});

// this is where we will play the movie
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/app.html');
});

// NEW ROUTES WITH EJS
app.get('/home', function (req, res) {
    crud.getMovies().then(function (data) {
        res.render('catalog', {
            results: data,
        });
    });
});

app.get('/movie/:id', function (req, res) {
    let movieId = req.params.id;
    crud.getMovie(movieId).then(function (data) {
        res.render('movie_detail', {
            movie: data
        });
    });
});

app.get('/about', function (req, res) {
    res.sendFile(__dirname + '/public/about.html');
});

app.get('/watchlist', function (req, res) {
    crud.getWatchlistMovies().then(function (data) {
        res.render('watchlist', {
            results: data
        });
    });
});

// filter landing page
app.get('/filters', function (req, res) {
    let latestYear = new Date().getFullYear();
    let movieGenres = genres();
    crud.getConfigData().then(function (data) {
        res.render('filters', {
            year: latestYear,
            genres: movieGenres
        });
    });
});

// filter submit
app.post('/filter', function (req, res) {
    let post = req.body;
    crud.filterMovies(post).then(function (data) {
        res.render('moviesresults', {
            results: data
        });
    }).catch(function (e) {
        res.status(400).send('Error');
    });
});

// search landing page
app.get('/search', function (req, res) {
    res.render('search', {
        results: {}
    });
});

// search submit
app.post('/search', function (req, res) {
    let post = req.body;
    crud.searchMovies(post).then(function (data) {
        res.render('moviesresults', {
            results: data
        });
    }).catch(function (e) {
        res.status(400).send('Error');
    });
});

// config landig page
app.get('/config', function (req, res) {
    crud.getConfigData().then(function (data) {
        res.render('config', {
            configData: data
        });
    });
});

// save the config changes
app.post('/save-config', function (req, res) {
    let post = req.body;
    crud.saveConfig(post).then(function (data) {
        res.status(200).send('Saved');
    }).catch(function (e) {
        res.status(400).send('Error');
    });

});


// get data from the movie database example , just for test
app.get('/preview', function (req, res) {
    crud.movieInfo(353081).then(function (data) {
        res.json({
            data
        })
    });
});

// Start Server
server.listen(3000, function () {
    console.log('MoviezTV server started on port 3000.');
    init(); // set server configurations
});

function init(){
    let deviceConfig = {}
    let today = new Date().toLocaleString();

    crud.getConfigData().then(function (data) {
        // if empty
        if(!data.deviceId){
            getmac.getMac(function(err, macAddress){
                if (err)  throw err
                let device = macAddress + today;
                let deviceId = md5(device);
                deviceConfig.deviceId = deviceId;
                crud.saveConfig(deviceConfig);
            })
        }
        // if empty or 0
        if(!data.deviceTimesStarted || data.deviceTimesStarted == 0){
            deviceConfig.deviceTimesStarted  = 1;
        } else{
            deviceConfig.deviceTimesStarted  = parseInt(data.deviceTimesStarted)  + 1;
        }
        crud.saveConfig(deviceConfig);
    });
}

let genres = function () {
    let movieGenres = ["Comedy", "Fantasy", "Crime", "Drama", "Music", "Adventure", "History", "Thriller", "Animation", "Family", "Mystery", "Biography", "Action", "Film-Noir", "Romance", "Sci-Fi", "War", "Western", "Horror", "Musical", "Sport"];
    movieGenres.sort();
    return movieGenres;
}

/*
Save temp info of the movie that is actually playing,
we where using a temp localstorage in the browsers but it beame a mess, so insteado
we can save the data in the memory of the server and check it in very system that connects
*/

function getPlayerMovieData() {
    return MOVIEDATA;
}

// get data from the movie database example
app.get('/movie-info', function (req, res) {
    let data = getPlayerMovieData();
    res.json(data)
});

app.get('/movie-info/progress', function (req, res) {
    res.json(MOVIEDATA.progress);
});

app.post('/movie-info/progress', function (req, res) {
    let post = req.body;
    MOVIEDATA.progress = post.progress;
});


/*

SOCKET.IO SECTION

*/

// Socket.io handles the communication between the remote and our app in real time, 
// so we can instantly send commands from a computer to our remote and back
io.on('connection', function (socket) {
    // we will get the id of the movie to watch, search in the db and the file and then send it to the TV
    socket.on('eventPlayMovie', function (data) {
        let movieId = data.movieId;
        crud.getMovie(movieId).then(function (movieData) {
            let files = JSON.parse(movieData.moviesPathJSON);
            let validVideoExt = ["avi", "drc", "flv", "m2v", "m4p", "m4v", "mov", "mp2", "mp4", "ogg", "ogv", "vob", "webm", "wmv", "yuv"];
            files.forEach(function (filename) {
                let ext = filename.split('.').pop();
                if (ext && validVideoExt.includes(ext)) {
                    urlExists(filename, function (err, exists) {
                        if (exists) {
                            MOVIEDATA.id = movieId;
                            MOVIEDATA.name = movieData.name;
                            MOVIEDATA.image = movieData.poster;
                            MOVIEDATA.progress = 0;
                            MOVIEDATA.status = "playing";
                            //TODO:FIX THIS IN CASE THERE IS MORE THAN 1 MOVIE SEND THE FIRST THAT EXISTS AND HAS NO ERRORS AND EXIT.
                            io.emit('emitData', {
                                file: filename
                            });
                            return false;
                        } else {
                            io.emit('errorVideo', {
                                text: "The file does not exist."
                            });
                        }
                    });
                }
            }); // for eeach files 
        });
    });

    socket.on('respondMovieLoaded', function (data) {
        MOVIEDATA.duration = data.duration;
        io.emit('returnMovieLoaded', MOVIEDATA);
    });

    socket.on('eventPause', function () {
        MOVIEDATA.status = "pause";
        io.emit('emitPause');
    });

    socket.on('respondPause', function () {
        MOVIEDATA.status = "pause";
        io.emit('returnPause');
    });

    socket.on('eventPlay', function () {
        MOVIEDATA.status = "play";
        io.emit('emitPlay');
    });

    socket.on('respondPlay', function () {
        MOVIEDATA.status = "play";
        io.emit('returnPlay');
    });

    socket.on('eventSkipTo', function (data) {
        io.emit('emitSkipTo', {
            seconds: data.seconds
        });
    });

    socket.on('eventToggleWatchlist', function (data) {
        let movieId = data.movieId;
        let flag = data.flag;
        crud.toggleWatchlist(movieId, flag).then(function (movieData) {});
    });

    socket.on('respondMovieAdvance', function (seconds) {
        MOVIEDATA.progress = seconds;
        io.emit('returnMovieAdvance', {
            seconds: seconds
        });
    });

    socket.on('respondClearMovieData', function () {
        io.emit('returnClearMovieData');
        MOVIEDATA.id = "";
        MOVIEDATA.image = "";
        MOVIEDATA.name = "";
        MOVIEDATA.status = "";
        MOVIEDATA.duration = 0;
        MOVIEDATA.progress = 0;
    })

});


function shutdown(callback) {
    exec('shutdown now', function (error, stdout, stderr) {
        callback(stdout);
    });
}

function reboot(callback) {
    exec('shutdown -r now', function (error, stdout, stderr) {
        callback(stdout);
    });
}

// Need to work on much of this logic
function update(callback) {
    //exec('sh ./script/update.sh', function(error, stdout, stderr){ callback(stdout); });
}
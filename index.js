const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path')
const crud = require("./lib/crud");
const imageBaseUrl = 'http://image.tmdb.org/t/p/original/';
const bodyParser = require("body-parser");
const urlExists = require('url-exists');

let ip = require('ip');
let serverName = "mz.tv"
let ejs = require('ejs');

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
    console.log("Sending shut down instructions...")
    res.send("bye bye");
});

app.get('/refresh-db', function (req, res) {
    console.log("Refresh the database");
    res.send("Refresh database");
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
    console.log("inside the movie id");
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
    crud.getConfigData().then(function (data) {
        res.render('watchlist', {
            results: {}
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
        console.log(data)
        res.render('search', {
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
    console.log("saving data...")
    let post = req.body;
    crud.saveConfig(post).then(function (data) {
        res.status(200).send('Saved');
    }).catch(function (e) {
        res.status(400).send('Error');
    });

});

// Socket.io handles the communication between the remote and our app in real time, 
// so we can instantly send commands from a computer to our remote and back
io.on('connection', function (socket) {

    // These are playback controls. They receive the “play” and “pause” events from the remote

    socket.on('watchVideo', function (data) {
        console.log("watchVideo acction..." + data.movieId);
        let movieId = data.movieId;
        crud.getMovie(movieId).then(function (movieData) {
            let files = JSON.parse(movieData.moviesPathJSON);
            console.log(files)
            let validVideoExt = ["avi", "drc", "flv", "m2v", "m4p", "m4v", "mov", "mp2", "mp4", "ogg", "ogv", "vob", "webm", "wmv", "yuv"];
            files.forEach(function (filename) {
                let ext = filename.split('.').pop();
                if (ext && validVideoExt.includes(ext)) {
                    urlExists(filename, function (err, exists) {
                        if (exists) {
                            //TODO:FIX THIS IN CASE THERE IS MORE THAN 1 MOVIE SEND THE FIRST THAT EXISTS AND HAS NO ERRORS AND EXIT.
                            io.emit('watchVideo', {
                                file: filename
                            });
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

    socket.on('pauseVideo', function () {
        io.emit('pauseVideo');
    });

});

// get data from the movie database example
app.get('/preview', function (req, res) {
    console.log("preview of movie...")
    crud.movieInfo(353081).then(function (data) {
        res.json({
            data
        })
    });
});

// Start Server
server.listen(3000, function () {
    console.log('Example app listening on ' + ip.address() + ':3000.');
});


let genres = function () {
    let movieGenres = ["Comedy", "Fantasy", "Crime", "Drama", "Music", "Adventure", "History", "Thriller", "Animation", "Family", "Mystery", "Biography", "Action", "Film-Noir", "Romance", "Sci-Fi", "War", "Western", "Horror", "Musical", "Sport"];
    movieGenres.sort();
    return movieGenres;
}

function populateMovieData(){

}
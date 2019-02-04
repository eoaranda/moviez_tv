/*
JS for the APP
*/
const socket = io.connect();
const TV_MOVIE_INFO = "/movie-info";

$(document).ready(function () {
    $('page').load('/home');

    $('#menu a').click(function (e) {
        e.preventDefault();
        $('a').removeClass('active');
        $(this).addClass('active');
        let link = "/" + $(this).attr("id");
        $('page').load(link);
    });

    $('.poster a').click(function (e) {
        e.preventDefault();
        let link = "movie/" + $(this).attr("id");
        $('page').load(link);
    })

    $('#play-pause-button').on("click", function () {
        if ($(this).hasClass('fa-play')) {
            $(this).removeClass('fa-play');
            $(this).addClass('fa-pause');
            eventPlay();
        } else {
            $(this).removeClass('fa-pause');
            $(this).addClass('fa-play');
            eventPause();
        }
    });

    $('#slider-controler').on('input change', function () {
        console.log("movie control change = " + this.value);
        eventSkipTo(this.value);
    });

});

/*
MENU NAVIGATION STUFF
*/

function menuPage(linkPage) {
    $('a').removeClass('active');
    let link = "/" + linkPage;
    $('page').load(link);
}

function movieDetail(movieId) {
    $('a').removeClass('active');
    let link = "movie/" + movieId;
    $('page').load(link);
}

function setSliderProgress(seconds) {
    var slider = document.getElementById("slider-controler");
    slider.value = seconds;
}

function displayMoviePlayingData() {
    displayMovieControls();
    setMovieControlsValues();
}

function displayMovieControls(data) {
    let name = localStorage.getItem("movieName");
    let img = localStorage.getItem("movieImage");
    let duration = localStorage.getItem("movieDuration");
    $('#movie-controls').show();
    $('#slider-container').show();
    $('#mc-name').html(name);
    $('#mc-img').attr('src', img);
    $('#slider-controler').attr('max', duration);
}

function setMovieControlsValues() {
    // set the seconds of the slider
    // 1) request progress in the video
    let seconds = localStorage.getItem("movieProgress");
    // 2) set the progress in the slider 
    setSliderProgress(seconds);
    //set the play/pause controls
    //will detect what was the last status of the play/pause control
    let movieStatus = localStorage.getItem("movieStatus");
    if (movieStatus == "playing") {
        displayPlayButton();
    } else {
        displayPauseButton();
    }
}

function displayPauseButton() {
    $('#play-pause-button').removeClass('fa-pause');
    $('#play-pause-button').addClass('fa-play');
}

function displayPlayButton() {
    $('#play-pause-button').removeClass('fa-play');
    $('#play-pause-button').addClass('fa-pause');
}

function hideMoviePlayingData() {
    $('#movie-controls').hide();
    $('#slider-container').hide();
}

function returnToMovie() {
    $('a').removeClass('active');
    let movieId = localStorage.getItem("movieId");
    let link = "movie/" + movieId;
    $('page').load(link);
}

// Promise
function setLocalStorage(data) {
    return new Promise(
        function (resolve, reject) {
            if (data != null) {
                localStorage.setItem("movieId", data.id);
                localStorage.setItem("movieImage", data.image);
                localStorage.setItem("movieName", data.name);
                localStorage.setItem("movieStatus", data.status);
                localStorage.setItem("movieDuration", data.duration);
                localStorage.setItem("movieProgress", data.progress);
                resolve("saved");
            } else {
                localStorage.clear(); // empty the entire local storage
            }

        }
    )
}

function init() {
    console.log("INIT : Mobile app started.");
    //we do a first search to check if there is something playing in the server
    $.getJSON(TV_MOVIE_INFO, function (data) {
        if (data.id == "") {
            hideMoviePlayingData();
        } else {
            //use the data first from the db and then set the data from the localstorage
            setLocalStorage(data).then(function(res) {
                if(res == "saved"){
                    displayMoviePlayingData();
                }
              })
        }
    });
}
window.onload = init;

/*
ALL THE SOCKET ON ACTIONS BELOW
*/

/*
This is the action that gets triggered as soon as the movie starts playing
*/
function eventPlayMovie(movieId) {
    socket.emit('eventPlayMovie', {
        movieId: movieId
    });
}

function eventPause() {
    localStorage.setItem("movieStatus", "pause");
    socket.emit('eventPause');
}

function eventPlay() {
    localStorage.setItem("movieStatus", "play");
    socket.emit('eventPlay');
}

function eventSkipTo(seconds) {
    socket.emit('eventSkipTo', {
        seconds: seconds
    });
}

function eventToggleWatchlist(movieId, flag) {
    socket.emit('eventToggleWatchlist', {
        movieId: movieId,
        flag: flag
    });
}

// general error
socket.on('errorVideo', function (data) {
    console.log(data);
});

socket.on('returnMovieLoaded', function (data) {
    $.getJSON(TV_MOVIE_INFO, function (data) {
        if (data.id != "") {
            setSliderProgress(0); // set slider to 0
            setLocalStorage(data).then(function(res) {
                if(res == "saved"){
                    displayMoviePlayingData(); // display the controls
                    displayPlayButton();
                }
              })
            
        }
    });
});

socket.on('returnClearMovieData', function () {
    hideMoviePlayingData();
    setLocalStorage(null); // set everything to empty
});

socket.on('returnMovieAdvance', function (data) {
    localStorage.setItem("movieProgress", data.seconds);
    setSliderProgress(data.seconds);
});

socket.on('returnPause', function () {
    displayPauseButton();
});

socket.on('returnPlay', function () {
    displayPlayButton();
});
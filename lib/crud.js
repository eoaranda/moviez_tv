"use strict";
const sqlite3 = require('sqlite3').verbose();
const databaseName = './db/moviez.db';
const MovieDb = require('moviedb-promise')
const moviedb = new MovieDb('931d776ae4bc149c995975a52b114799'); 

let db = new sqlite3.Database(databaseName, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the chinook database.');
});

class Crud {

}

Crud.prototype.saveConfig = function (data) {
    return new Promise(function (resolve, reject) {
        try {
            for (var key in data) {
                let sql = "Update mzConfig set value = '" + data[key] + "' where configName = '" + key + "'";
                db.run(sql);
            }
            resolve("ok");
        } catch (ex) {
            reject(ex)
        }
    });
}

Crud.prototype.toggleWatchlist = function (movieId, flag) {
    return new Promise(function (resolve, reject) {
        try {
            let sql = "Update mzMovieList set watchlist = "+flag+" where movieId = '" + movieId + "'";
            db.run(sql);
            resolve("ok");
        } catch (ex) {
            reject(ex)
        }
    });
}

Crud.prototype.getWatchlistMovies = function () {
    return new Promise(function (resolve, reject) {
        try {
            db.all("SELECT * FROM mzMovieList where watchlist = 1 ORDER BY movieId desc", function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.getMovies = function () {
    return new Promise(function (resolve, reject) {
        try {
            db.all("SELECT * FROM mzMovieList order by year desc limit 100", function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.getLatestMovies = function () {
    return new Promise(function (resolve, reject) {
        try {
            db.all("SELECT * FROM mzMovieList ORDER BY movieId desc", function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}
// data from the db and from the imdb
Crud.prototype.getMovie = function (movieId) {
    return new Promise(function (resolve, reject) {
        try {
            db.get("SELECT * FROM mzMovieList where movieId = " + movieId, function (err, movie) {
                moviedb.searchMovie({
                    query: movie.name,
                    year: movie.year
                }).then(res => {
                    if (res != null) Object.assign(movie, {
                        movie_db: res.results[0]
                    })
                    resolve(movie);
                }).catch(console.error)
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.getMoviesByGenre = function (genre) {
    return new Promise(function (resolve, reject) {
        try {
            db.all("SELECT * FROM mzMovieList where genre = '" + genre + "'", function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.getMoviesByYear = function (year) {
    return new Promise(function (resolve, reject) {
        try {
            db.all("SELECT * FROM mzMovieList where year = '" + year + "'", function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.filterMovies = function (post) {
    //build the query
    let gParams = (post.genreParams === undefined) ? [] : post.genreParams;
    let yParams = (post.yearParams === undefined) ? [] : post.yearParams;
    let yQuery = "";
    let gQuery = "";
    if (yParams.length > 0) {
        let yString = yParams.join("','");
        yQuery = " year in ('" + yString + "')";
    }
    if (gParams.length > 0) {
        let gString = gParams.join("','");
        gQuery = " genre in ('" + gString + "')";
    }
    let extraFields = "";
    if (yQuery != "") {
        extraFields = yQuery;
    }
    if (gQuery != "") {
        extraFields = gQuery;
    }
    if (yQuery != "" && gQuery != "") {
        extraFields = gQuery + " and " + yQuery;
    }

    let sql = "SELECT * FROM mzMovieList where " + extraFields;
    console.log(sql);
    return new Promise(function (resolve, reject) {
        try {
            db.all(sql, function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.searchMovies = function (post) {
    return new Promise(function (resolve, reject) {
        try {
            let sql = "SELECT * FROM mzMovieList where name like '%" + post.searchinput + "%' ";
            db.all(sql, function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

// to search by the moviedb id, only used for example right now
Crud.prototype.movieInfo = function (id) {
    return new Promise(function (resolve, reject) {
        try {
            moviedb.movieInfo({
                id: id
            }).then(res => {
                resolve(res);
            }).catch(console.error)
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.getConfigData = function () {
    let configData = {};
    return new Promise(function (resolve, reject) {
        try {
            db.all("SELECT * FROM mzConfig", function (err, data) {
                for (var index in data) {
                    configData[data[index].configName] = data[index].value;
                }
                resolve(configData);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

module.exports = new Crud;
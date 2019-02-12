"use strict";
const sqlite3 = require('sqlite3').verbose();
const databaseName = './db/moviez.db';
const MovieDb = require('moviedb-promise')
const moviedb = new MovieDb('931d776ae4bc149c995975a52b114799');
const https = require('https');

let db = new sqlite3.Database(databaseName, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to database.');
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
            let sql = "Update mzMovieList set watchlist = " + flag + " where rowid = '" + movieId + "'";
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
            db.all("SELECT rowid as movieId, m.* FROM mzMovieList m where watchlist = 1 ORDER BY rowid desc", function (err, movies) {
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
            db.all("SELECT rowid as movieId, m.* FROM mzMovieList m order by year desc limit 100", function (err, movies) {
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
            db.all("SELECT rowid as movieId, m.* FROM mzMovieList m ORDER BY rowid desc", function (err, movies) {
                resolve(movies);
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

Crud.prototype.updateMovieList = function (movieListPathUrl) {
    let self = this;
    return new Promise(function (resolve, reject) {
        try {
            let fullDataPayLoad = '';
            var req = https.request(movieListPathUrl, (res) => {
                res.on('data', (d) => {
                    fullDataPayLoad += d;
                });
                res.on('end', () => {
                    var JSONPayLoad = JSON.parse(fullDataPayLoad);
                    self.loadMovieJson(JSONPayLoad.RECORDS).then(function (data) {
                        resolve(data);
                    }).catch(function (error) { // (B)
                        reject(error);
                    });
                });
            });
            req.end();
        } catch (err) {
            reject("error");
        }
    })
}

Crud.prototype.loadMovieJson = function (jsonData) {
    return new Promise(function (resolve, reject) {
            for (let i = 0; i < jsonData.length; i++) {
                let title = jsonData[i].title;
                let year = jsonData[i].year;
                let posterImg = jsonData[i].posterImg;
                let moviesPathJson = jsonData[i].moviesPathJson;
                let sql = "INSERT INTO mzMovieList (name,year,poster,moviesPathJSON) VALUES(" +
                    "'" + title + "'," +
                    "'" + year + "'," +
                    "'" + posterImg + "'," +
                    "'" + moviesPathJson + "'" +
                    ")";
                db.run(sql, function (err, rows) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows)
                    }
                });
            }
    })
}


// data from the db and from the imdb
Crud.prototype.getMovie = function (movieId) {
    return new Promise(function (resolve, reject) {
        try {
            db.get("SELECT rowid as movieId, m.* FROM mzMovieList m where rowid = " + movieId, function (err, movie) {
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
            db.all("SELECT rowid as movieId, m.* FROM mzMovieList m where genre = '" + genre + "'", function (err, movies) {
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

    let sql = "SELECT rowid as movieId, m.* FROM mzMovieList m where " + extraFields;
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
            let sql = "SELECT rowid as movieId, m.* FROM mzMovieList m where name like '%" + post.searchinput + "%' ";
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
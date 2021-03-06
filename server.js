'use strict';

// require statements (importing packages)
let express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');


// initializations and confieguration
let app = express();
app.use(cors());
require('dotenv').config();
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
// PORT
const PORT = process.env.PORT;




//===============
// handler functions
//==============

// handle the error page not found
const pageNotFound = (req, res) => {
    res.status(404).send('Sorry, the page does not exist Try again :)');
}


// handle the location
const handleLocation = (req, res) => {
    try {
        let searchQuery = req.query.city;
        checkDB(searchQuery).then(locationObject => {
            if (locationObject) {
                console.log('From the Data Base');
                res.status(200).send(locationObject);
            } else {
                getLocaitonData(searchQuery).then(locationObject => {
                    insertLocationData(locationObject);
                    console.log('From the API..')
                    res.status(200).send(locationObject);
                });
            }
        });

    } catch (error) {
        let errorObject = { status: 500, responseText: `Sorry, something went wrong ${error}` };
        res.status(500).send(errorObject);
    }
}

// handle the weather
const handleWeather = (req, res) => {
    try {
        getWeatherData(req.query.latitude, req.query.longitude).then(weatherObjects => {
            res.status(200).send(weatherObjects);
        })
    } catch (error) {
        let errorObject = { status: 500, responseText: `Sorry, something went wrong ${error}` };
        res.status(500).send(errorObject);
    }

}

// handle the parks 
const handlePark = (req, res) => {
    try {
        getParksData(req.query.search_query).then(parkObjects => {
            res.status(200).send(parkObjects);
        })
    } catch (error) {
        let errorObject = { status: 500, responseText: `Sorry, something went wrong ${error}` };
        res.status(500).send(errorObject);
    }

}

// handle movies
const handleMovies = (req, res) => {
    let searchQuery = req.query.search_query;
    getMoviesData(searchQuery).then(moviesArray => {
        res.status(200).send(moviesArray);
    }).catch(error => {
        res.status(500).send(error);
    });
}
// handle yelp 
const handleYelp = (req, res) => {
    let location = req.query.search_query;
    let pageNumber = req.query.page;
    getResturantsData(location, pageNumber).then(restData => {
        res.status(200).send(restData);
    }).catch(error => {
        res.status(500).send(error);
    })
}

//===============
// functions
//===============

// GET request movies list from the API and return an array of objects
const getMoviesData = (searchQuery) => {
    const url = 'https://api.themoviedb.org/3/search/movie';
    const query = {
        api_key: process.env.MOVIE_API_KEY,
        query: searchQuery,
        limit: 5
    };

    return superagent.get(url).query(query).then(data => {
        let resultsArray = data.body.results;
        let moviesArray = resultsArray.map(value => new Movie(value));
        return moviesArray;
    }).catch(error => {
        console.log('API data Error...' + error);
    })


}

// GET request resturant list from the API and return an array of objects
const getResturantsData = (searchQuery, pageNumber) => {
    let url = 'https://api.yelp.com/v3/businesses/search';
    let offsetNumber = 0 + (pageNumber * 5);
    const query = {
        term: 'restaurants',
        location: searchQuery,
        limit: 5,
        offset: offsetNumber
    };
    const key = { Authorization: `Bearer ${process.env.YELP_API_KEY}` };

    return superagent.get(url).set(key).query(query).then(data => {
        let resturantObject = data.body.businesses;
        let resturantArray = resturantObject.map(value => new Resturant(value));
        return resturantArray;
    }).catch(error => {
        console.log(error);
    })
}


// check if the location is in the data base if it does send the response if not request from the API
const checkDB = (city_name) => {

    let dbQuery = `SELECT * FROM locations WHERE city_name='${city_name}'`;
    return client.query(dbQuery).then(data => {
        // console.log(data);
        if (data.rows.length !== 0) {
            let responseObject = new CityLocation(data.rows[0].city_name, data.rows[0].formatted_query, data.rows[0].latitude, data.rows[0].longitude);
            return responseObject;
        } else {
            return false;
        }
    }).catch(error => {
        console.log(error);
    })
}
// Inserte the new location data into the Data Base
const insertLocationData = (city) => {
    let dbQuery = `INSERT INTO locations(city_name, formatted_query, latitude, longitude) VALUES($1,$2,$3,$4)`;
    let secureValues = [city.search_query, city.formatted_query, city.latitude, city.longitude];
    client.query(dbQuery, secureValues).then(data => {
        console.log('Data for the location INSERTED :)');
    })
}



// return an string of the address from the addresses objects
const getAddress = (address) => {
    let addressString = Object.values(address).join(' ');
    return addressString;
}




// return an array of objects of parks
const getParksData = (search_query) => {
    const url = 'https://developer.nps.gov/api/v1/parks';
    const query = {
        api_key: process.env.PARKS_API_KEY,
        q: search_query,
        limit: 2
    }
    return superagent.get(url).query(query)
        .then(parksData => {
            let parksArray = parksData.body.data.map(value => {
                return new Park(value.fullName, getAddress(value.addresses[0]), value.fees.length, value.description, value.url);
            });
            return parksArray;
        }).catch(error => {
            console.log(error);
        })
}


// return an array of the data of the weather
const getWeatherData = (latitude, longitude) => {
    const url = 'https://api.weatherbit.io/v2.0/forecast/daily';
    const query = {
        key: process.env.WEATHER_API_KEY,
        lat: latitude,
        lon: longitude,
    }
    return superagent.get(url).query(query)
        .then(weatherData => {
            let weatherArray = weatherData.body.data.map(value => {
                return new Weather(value.weather.description, formatDate(value.valid_date), value.description, value.url);
            })
            return weatherArray;
        }).catch(error => {
            return error;
        });
}
// format the date to day name/ month name/ day number/ year number
const formatDate = (date) => {
    let str = new Date(date).toString()
    let strArr = str.split(' ');
    return strArr.slice(0, 4).join(' ');
}

// return an array of location data (longitude, latitude, name)
function getLocaitonData(searchQuery) {
    let url = 'https://us1.locationiq.com/v1/search.php';
    const query = {
        key: process.env.GEOCODE_API_KEY,
        q: searchQuery,
        limit: 1,
        format: 'json'
    }
    return superagent.get(url).query(query)
        .then(data => {
            let cityObject = data.body[0];
            let responseObject = new CityLocation(searchQuery, cityObject.display_name, cityObject.lat, cityObject.lon);
            return responseObject
        }).catch(error => {
            console.log(error);
        });
}

// ============
// routes - endpoinst
//=============
app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.get('/parks', handlePark);
app.get('/movies', handleMovies);
app.get('/yelp', handleYelp);
app.get('*', pageNotFound);
//=============
// constructors
//=============

// constructro for location
function CityLocation(searchQuery, displayName, lat, lon) {
    this.search_query = searchQuery;
    this.formatted_query = displayName;
    this.latitude = lat;
    this.longitude = lon;
}
// constructor for weather
function Weather(description, date) {
    this.forecast = description;
    this.time = date;
}
// constructor for parks
function Park(name, address, fee, description, url) {
    this.name = name;
    this.address = address;
    this.fee = fee;
    this.description = description;
    this.url = url
}
// constructor for Movies
function Movie(movieObject) {
    this.title = movieObject.original_title;
    this.overview = movieObject.overview;
    this.average_votes = movieObject.vote_average;
    this.total_votes = movieObject.vote_count;
    this.image_url = `https://image.tmdb.org/t/p/w500/${movieObject.poster_path}`;
    this.popularity = movieObject.popularity;
    this.released_on = movieObject.release_date
}

// consturctor for resturants
function Resturant(value) {
    this.name = value.name;
    this.image_url = value.image_url;
    this.price = value.price;
    this.rating = value.rating;
    this.url = value.url
}



// listining ports
client.connect().then(() => {
    app.listen(PORT, () => {
        console.log('the app is listening on port: ' + PORT)
    });
}).catch(error => {
    console.log('There is an Error ' + error);
});



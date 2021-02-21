'use strict';



// require statements (importing packages)
let express = require('express');
const cors = require('cors');

// initializations and conficguration
let app = express();
app.use(cors());
require('dotenv').config();


const PORT = process.env.PORT;



// handler functions

// handle the location
const handleLocation = (req, res) => {
    let searchQuery = req.query.city;
    let locationObject = getLocaitonData(searchQuery);
    res.status(200).send(locationObject);
}
// handle the weather
const handleWeather = (req, res) => {

    let weatherObjects = getWeatherData();
    res.status(200).send(weatherObjects);
}

// return an array of the data of the weather
const getWeatherData = () => {
    let weatherArray = [];
    let weatherData = require('./data/weather.json');
    weatherData.data.forEach(element => {
        weatherArray.push(new weather(element.weather.description, formatDate(element.valid_date)));
    });
    return weatherArray;
}

const formatDate = (date) => {
    let str = new Date(date).toString()
    let strArr = str.split(' ');
    return strArr.slice(0, 4).join(' ');
}



// routes - endpoinst
app.get('/location', handleLocation);
app.get('/weather', handleWeather);

// handle data for functions
function getLocaitonData(searchQuery) {
    // get the data array from the json
    let locaitonData = require('./data/location.json');
    // get the lon and lat
    let longitude = locaitonData[0].lon;
    let latitude = locaitonData[0].lat;
    let displayName = locaitonData[0].display_name;

    let responseObject = new CityLocation(searchQuery, displayName, latitude, longitude);

    return responseObject;
}

// constructors

// constructro for location
function CityLocation(searchQuery, displayName, lat, lon) {
    this.search_query = searchQuery;
    this.formatted_query = displayName;
    this.latitude = lat;
    this.longitude = lon;
}
// constructor for weather
function weather(description, date) {
    this.forecast = description;
    this.time = date;
}


// listining ports
app.listen(PORT, () => {
    console.log('the app is listening on port: ' + PORT)
});



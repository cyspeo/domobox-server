var     request = require('request');


console.log("Test GET programmation")
request({
    uri: "http://localhost:3001"+"/api/piscine/programmation",
    method: "GET",
    timeout: 10000,
    followRedirect: true,
    maxRedirects: 10
}, function (error, response, body) {
    if (error) {
        console.error("GET /api/piscine/programmation ERROR : " + error)
    } else {
        console.log("GET /api/piscine/programmation =>" + body);
    }
});
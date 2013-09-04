require('source-map-support').install();

utils = require("./utils")
inspect = utils.inspect

myTest = () ->
  console.log(inspect("Hello world number 2"))
  throw new Error("Bad");

myTest()

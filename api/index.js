const { toLambda } = require('probot-serverless-now')
const hydrabot = require('../')
module.exports = toLambda(hydrabot)
const Configuration = require('../configuration/configuration')
const { NoResponse, defaults } = require('./needs-info')

async function needsInfoSweeper (context, log) {
  let config = await Configuration.instanceWithContext(context)
  config = config.settings ? config.settings : config
  if (config) {
    const configWithDefaults = Object.assign({}, defaults, config)
    const noResponse = new NoResponse(context, configWithDefaults, log)
    return noResponse.sweep()
  }
}

async function needsInfoExecutor (context, log) {
  let config = await Configuration.instanceWithContext(context)
  config = config.settings ? config.settings : config
  if (config) {
    const configWithDefaults = Object.assign({}, defaults, config.needsInfo)
    const noResponse = new NoResponse(context, configWithDefaults, log)
    return noResponse.unmark(context.issue())
  }
}

module.exports = {
  needsInfoSweeper,
  needsInfoExecutor
}

const createScheduler = require('probot-scheduler')
const commands = require('probot-commands')
const reminders = require('./reminders')
const flexExecutor = require('./flex')
const Context = require('./context')
const logger = require('./logger')
const _ = require('lodash')
const createIssueBranchExecutor = require('./create-issue-branch/index')
const { executeFirstWDInstallation, weeklyDigestExecutor } = require('./weekly/index')
const { needsInfoSweeper, needsInfoExecutor } = require('./needs-info/index')
const deploymentExecutor = require('./deployment/index')

require('colors')

function logEventReceived (context) {
  let log = logger.create('hydrabot')

  const event = `${context.event}.${context.payload.action}`

  const eventReceivedLog = {
    log_type: logger.logTypes.EVENT_RECEIVED,
    event
  }

  if (event.includes('installation')) {
    const installation = context.payload.installation

    let repositoriesAdded = []
    let repositoriesRemoved = []

    if (event === 'installation') {
      repositoriesAdded = context.payload.repositories.map(repo => repo.full_name)
    } else if (event === 'installation_repositories') {
      repositoriesAdded = context.payload.repositories_added.map(repo => repo.full_name)
      repositoriesRemoved = context.payload.repositories_removed.map(repo => repo.full_name)
    }

    Object.assign(eventReceivedLog, {
      installation_id: installation.id,
      account: installation.account.login,
      account_type: installation.account.type,
      repositories: { added: repositoriesAdded, removed: repositoriesRemoved },
      sender: context.payload.sender.login
    })
  }

  if (!(_.isUndefined(context.payload.repository))) {
    Object.assign(eventReceivedLog, {
      repo: context.payload.repository.full_name,
      url: context.payload.repository.html_url,
      isPrivate: context.payload.repository.private
    })
  }

  log.info(eventReceivedLog)
}

class Hydrabot {
  constructor (mode) {
    this.mode = mode
  }

  start (robot) {
    let log = logger.create('hydrabot')
    let intervalMins = 10
    if (this.mode === 'development') {
      log.info('In DEVELOPMENT mode.')
    } else {
      log.info('In PRODUCTION mode.')
      intervalMins = 20
    }

    if (process.env.HYDRABOT_SCHEDULER === 'true') {
      log.info('Starting scheduler at 120 second intervals.')
      this.schedule(robot, { interval: 1000 * 60 * intervalMins })
    } else {
      log.info(`Scheduler: ${'off'.bold.white}!`)
    }

    this.labelManager(robot)
    this.createIssueBranch(robot)
    this.flex(robot)
    this.weeklyDigest(robot)
    this.needsInfo(robot)
    this.deploy(robot)
    this.reminder(robot)
  }

  schedule (robot, options) {
    createScheduler(robot, options)
  }

  reminder (robot) {
    commands(robot, 'remind', reminders.set)
    robot.on('schedule.repository', reminders.check)
  }

  deploy (robot) {
    robot.on('pull_request.labeled', async pContext => {
      let context = new Context(pContext)
      let log = logger.create('hydrabot-deploy')
      await deploymentExecutor(context, log)
    })
  }

  labelManager (robot) {
    commands(robot, 'label', (context, command) => {
      const labels = command.arguments.split(/, */)
      return context.github.issues.addLabels(context.issue({ labels }))
    })

    commands(robot, 'remove', (context, command) => {
      const labels = command.arguments.split(/, */)
      return context.github.issues.removeLabels(context.issue({ labels }))
    })
  }

  // version 2 of hydrabot.
  flex (robot) {
    robot.on('*', async pContext => {
      let context = new Context(pContext)
      logEventReceived(context)
      let log = logger.create('hydrabot-stats')
      if ((context.event === 'installation' && context.payload.action === 'created') || context.event === 'installation_repositories') {
        await executeFirstWDInstallation(context, log)
      }
      await flexExecutor(context)
    })
  }

  createIssueBranch (robot) {
    robot.on('issues.assigned', async pContext => {
      let context = new Context(pContext)
      logEventReceived(context)
      let log = logger.create('hydrabot-branch')
      await createIssueBranchExecutor(context, log)
    })
  }

  weeklyDigest (robot) {
    robot.on('schedule.repository', async pContext => {
      let context = new Context(pContext)
      if (!context.event.includes('installation')) {
        let log = logger.create('hydrabot-stats')
        await weeklyDigestExecutor(context, log)
      }
    })
  }

  needsInfo (robot) {
    let log = logger.create('hydrabot-needsInfo')
    robot.on('issue_comment', async pContext => {
      let context = new Context(pContext)
      await needsInfoExecutor(context, log)
    })
    robot.on('schedule.repository', async pContext => {
      let context = new Context(pContext)
      await needsInfoSweeper(context, log)
    })
  }
}

module.exports = { Hydrabot: Hydrabot }

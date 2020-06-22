const yaml = require('js-yaml')
const Configuration = require('../../../lib/configuration/configuration')

describe('Loading bad configuration', () => {
  test('bad YML', async () => {
    const context = createMockGhConfig()
    context.probotContext.config = jest.fn().mockImplementation(() => {
      throw new yaml.YAMLException('Bad YML')
    })

    const config = await Configuration.instanceWithContext(context)
    expect(config.errors.size).toBe(1)
    expect(config.errors.has(Configuration.ERROR_CODES.BAD_YML)).toBe(true)
  })

  test('No YML found', async () => {
    const context = createMockGhConfig()
    context.probotContext.config = jest.fn().mockResolvedValue(null)
    const config = await Configuration.instanceWithContext(context)

    expect(config.errors.size).toBe(1)
    expect(config.errors.has(Configuration.ERROR_CODES.NO_YML)).toBe(true)
  })

  test('wrong version', () => {
    const settings = yaml.safeLoad(`
      version: not a number
      hydrabot:
        pull_request:
    `)
    const config = new Configuration(settings)
    expect(config.errors.size).toBe(1)
    expect(config.errors.has(Configuration.ERROR_CODES.UNKOWN_VERSION)).toBe(true)
  })

  test('missing hydrabot node', () => {
    const settings = yaml.safeLoad(`
      version: 2
    `)
    const config = new Configuration(settings)
    expect(config.errors.size).toBe(1)
    expect(config.errors.has(Configuration.ERROR_CODES.MISSING_HYDRABOT_NODE)).toBe(true)
  })

  test('multiple errors', () => {
    const settings = yaml.safeLoad(`
    version: foo
    hydrabto:
      when: bar
    `)
    const config = new Configuration(settings)
    expect(config.errors.size).toBe(2)
  })
})

describe('config file fetching', () => {
  test('fetch from main branch if event is not pull_request', async () => {
    let configString = `
          hydrabot:
            issues:
              stale:
                days: 20
                message: Issue test
            pull_requests:
              stale:
                days: 20
                message: PR test
        `
    let parsedConfig = yaml.safeLoad(configString)
    let context = createMockGhConfig(configString)
    const config = await Configuration.fetchConfigFile(context)
    expect(config).toEqual(parsedConfig)
  })

  test('fetch from main branch if the event is PR relevant and file is not modified or added', async () => {
    let configString = `
          hydrabot:
            issues:
              stale:
                days: 20
                message: Issue test
            pull_requests:
              stale:
                days: 20
                message: PR test
        `
    let prConfig = `
          hydrabot:
            issues:
              stale:
                days: 20
                message: Issue test
        `
    let parsedConfig = yaml.safeLoad(configString)
    let context = createMockGhConfig(
      configString,
      prConfig,
      { files: [ { filename: 'someFile', status: 'modified' } ] }
    )

    context.event = 'pull_request'
    let config = await Configuration.fetchConfigFile(context)
    expect(config).toEqual(parsedConfig)

    context.event = 'pull_request_review'
    config = await Configuration.fetchConfigFile(context)
    expect(config).toEqual(parsedConfig)
  })

  test('fetch from head branch if the event is relevant to PR and file is modified or added', async () => {
    let configString = `
          hydrabot:
            issues:
              stale:
                days: 20
                message: Issue test
            pull_requests:
              stale:
                days: 20
                message: from HEAD
        `
    let prConfigString = `
          hydrabot:
            issues:
              stale:
                days: 20
                message: From PR Config
        `
    let parsedConfig = yaml.safeLoad(prConfigString)
    let files = {files: [
      { filename: '.github/hydrabot.yml', status: 'modified' }
    ]}
    let context = createMockGhConfig(configString, prConfigString, files)
    context.event = 'pull_request'
    let config = await Configuration.fetchConfigFile(context)
    expect(config).toEqual(parsedConfig)

    context.event = 'pull_request_review'
    config = await Configuration.fetchConfigFile(context)
    expect(config).toEqual(parsedConfig)

    files = {files: [
      { filename: '.github/hydrabot.yml', status: 'added' }
    ]}
    context = createMockGhConfig(null, prConfigString, files)
    context.event = 'pull_request'
    config = await Configuration.fetchConfigFile(context)
    expect(config).toEqual(parsedConfig)
  })
})

describe('with version 2', () => {
  test('it loads correctly without version', () => {
    let configJson = yaml.safeLoad(`
      hydrabot:
        - when: pull_request.*
          validate:
          - do: approvals
            max:
              count: 5
          - do: title
            must_include:
              regex: 'title regex'
            must_exclude:
              regex: 'label regex'
    `)
    let config = new Configuration(configJson)
    config.settings = config.settings.hydrabot
    expect(config.settings[0].when).toBeDefined()
    expect(config.settings[0].validate).toBeDefined()
    expect(config.hasErrors()).toBe(false)
  })
})

describe('with version 1', () => {
  // write test to test for bad yml
  test('that constructor loads settings correctly', () => {
    let configJson = yaml.safeLoad(`
      version: 1
      hydrabot:
        approvals: 5
        label: 'label regex'
        title: 'title regex'
    `)
    let config = new Configuration(configJson)
    config.settings = config.settings.hydrabot
    let validate = config.settings[0].validate

    expect(validate.find(e => e.do === 'approvals').min.count).toBe(5)
    expect(validate.find(e => e.do === 'title').must_exclude.regex).toBe('title regex')
    expect(validate.find(e => e.do === 'label').must_exclude.regex).toBe('label regex')
  })

  test('that defaults are not injected when user defined configuration exists', () => {
    let configJson = yaml.safeLoad(`
      version: 1
      hydrabot:
        approvals: 1
      `)
    let config = new Configuration(configJson)
    config.settings = config.settings.hydrabot
    let validate = config.settings[0].validate
    expect(validate.find(e => e.do === 'approvals').min.count).toBe(1)
    expect(validate.find(e => e.do === 'title')).toBeUndefined()
    expect(validate.find(e => e.do === 'label')).toBeUndefined()
  })

  test('that instanceWithContext returns the right Configuration', async () => {
    let context = createMockGhConfig(`
      version: 1
      hydrabot:
        approvals: 5
        label: 'label regex'
        title: 'title regex'
    `)

    Configuration.instanceWithContext(context).then(config => {
      let validate = config.settings.hydrabot[0].validate
      expect(validate.find(e => e.do === 'approvals').min.count).toBe(5)
      expect(validate.find(e => e.do === 'title').must_exclude.regex).toBe('title regex')
      expect(validate.find(e => e.do === 'label').must_exclude.regex).toBe('label regex')
    })

    expect(context.probotContext.config.mock.calls.length).toBe(1)
  })

  test('that instanceWithContext returns the right Configuration (pull_requests)', async () => {
    let context = createMockGhConfig(`
      version: 1
      hydrabot:
        pull_requests:
          label: 'label pull regex'
          title: 'title pull regex'
    `)

    await Configuration.instanceWithContext(context).then(config => {
      config.settings = config.settings.hydrabot
      let validate = config.settings[0].validate
      expect(config.settings[0].when).toBe('pull_request.*')
      expect(validate.find(e => e.do === 'title').must_exclude.regex).toBe('title pull regex')
      expect(validate.find(e => e.do === 'label').must_exclude.regex).toBe('label pull regex')
    })
    expect(context.probotContext.config.mock.calls.length).toBe(1)
  })

  test('that instanceWithContext returns the right Configuration (issues)', async () => {
    let context = createMockGhConfig(`
      version: 1
      hydrabot:
        issues:
          label: 'label issue regex'
          title: 'title issue regex'
    `)

    await Configuration.instanceWithContext(context).then(config => {
      config.settings = config.settings.hydrabot
      let validate = config.settings[0].validate
      expect(config.settings[0].when).toBe('issues.*')
      expect(validate.find(e => e.do === 'title').must_exclude.regex).toBe('title issue regex')
      expect(validate.find(e => e.do === 'label').must_exclude.regex).toBe('label issue regex')
    })
    expect(context.probotContext.config.mock.calls.length).toBe(1)
  })

  test('that instanceWithContext loads the configuration for stale correctly when specified for pull_requests and issues separately', async () => {
    let context = createMockGhConfig(`
      version: 1
      hydrabot:
        pull_requests:
          label: 'label issue regex'
          title: 'title issue regex'
          stale:
            days: 20
    `)

    await Configuration.instanceWithContext(context).then(config => {
      config.settings = config.settings.hydrabot
      let when = config.settings[2]
      expect(when.validate[0].do).toBe('stale')
      expect(when.validate[0].days).toBe(20)
      expect(when.pass[0].do).toBe('comment')
      expect(when.pass[0].payload.body).toBe(Configuration.DEFAULTS.stale.message)
    })

    context = createMockGhConfig(`
      version: 1
      hydrabot:
        issues:
          stale:
            days: 20
    `)

    await Configuration.instanceWithContext(context).then(config => {
      config.settings = config.settings.hydrabot
      let when = config.settings[1]
      expect(when.validate[0].do).toBe('stale')
      expect(when.validate[0].days).toBe(20)
      expect(when.pass[0].do).toBe('comment')
      expect(when.pass[0].payload.body).toBe(Configuration.DEFAULTS.stale.message)
    })

    context = createMockGhConfig(`
      version: 1
      hydrabot:
        issues:
          stale:
            days: 20
            message: Issue test
        pull_requests:
          stale:
            days: 20
            message: PR test
    `)

    await Configuration.instanceWithContext(context).then(config => {
      config.settings = config.settings.hydrabot
      let issueWhen = config.settings[1]
      let pullWhen = config.settings[4]

      expect(issueWhen.when).toBe('schedule.repository')
      expect(pullWhen.when).toBe('schedule.repository')
      expect(issueWhen.validate[0].do).toBe('stale')
      expect(issueWhen.validate[0].days).toBe(20)
      expect(issueWhen.pass[0].do).toBe('comment')
      expect(issueWhen.pass[0].payload.body).toBe('Issue test')
      expect(pullWhen.validate[0].do).toBe('stale')
      expect(pullWhen.validate[0].days).toBe(20)
      expect(pullWhen.pass[0].do).toBe('comment')
      expect(pullWhen.pass[0].payload.body).toBe('PR test')
    })
  })

  test('that instanceWithContext return error if hydrabot.yml is not found', async () => {
    let context = {
      repo: () => {
        return {repo: '', owner: ''}
      },
      payload: {
        pull_request: {
          number: 1
        }
      },
      probotContext: {
        config: jest.fn().mockResolvedValue(null)
      }
    }

    let config = await Configuration.instanceWithContext(context)
    expect(config.hasErrors()).toBe(true)
    expect(config.errors.has(Configuration.ERROR_CODES.NO_YML)).toBe(true)
  })

  test('that instanceWithContext return error if hydrabot.yml is not found on PRs', async () => {
    const prConfigString = `
          hydrabot:
            issues:
              stale:
                days: 20
                message: From PR Config
        `
    let files = {files: [
      { filename: '.github/hydrabot.yml', status: 'modified' }
    ]}
    let context = createMockGhConfig(null, prConfigString, files)
    context.event = 'pull_request'
    context.github.repos.getContents = jest.fn().mockReturnValue(
      Promise.reject(
        new HttpError(
          '{"message":"Not Found","documentation_url":"https://developer.github.com/v3/repos/contents/#get-contents"}',
          404,
          'Not Found')
      )
    )

    let config = await Configuration.instanceWithContext(context)
    expect(config.hasErrors()).toBe(true)
    expect(config.errors.has(Configuration.ERROR_CODES.GITHUB_API_ERROR)).toBe(true)
  })

  test('that if pass, fail or error is undefined in v2 config, the config will not break', async () => {
    let settings = yaml.safeLoad(`
    version: 1
    hydrabot:
      issues:
        stale:
          days: 30
          message: 'There has not been any activity in the past month. Is there anything to follow-up?'`)

    const config = new Configuration(settings)
    config.settings = config.settings.hydrabot

    expect(config.settings.length).toBe(2)
    expect(config.settings[0].fail).toBeDefined()
    expect(config.settings[0].error).toBeDefined()
  })
})

// helper method to return mocked configiration.
const createMockGhConfig = (config, prConfig, options) => {
  return {
    repo: jest.fn().mockReturnValue({
      repo: '',
      owner: ''
    }),
    payload: {
      pull_request: {
        number: 1,
        head: {
          ref: 1,
          sha: 1
        }
      }
    },
    github: {
      repos: {
        getContents: jest.fn(() => {
          return Promise.resolve({
            data: { content: Buffer.from(prConfig).toString('base64') }
          })
        })
      },
      pulls: {
        listFiles: () => {
          return { data: options.files }
        }
      }
    },
    probotContext: {
      config: jest.fn().mockResolvedValue(yaml.safeLoad(config))
    }
  }
}

// to mimic HttpError (https://github.com/octokit/rest.js/blob/fc8960ccf3415b5d77e50372d3bb873cfec80c55/lib/request/http-error.js)
class HttpError extends Error {
  constructor (message, code, status) {
    super(message)
    this.message = message
    this.code = code
    this.status = status
  }
}

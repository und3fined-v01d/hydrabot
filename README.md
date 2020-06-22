<h1 align="center">
  <br>
  <img src="bot.jpeg" alt="Hydrabot" width="197">
  <br>
  <p>Hydrabot</p>
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/FREE-INSTALL-purple.svg" alt="Free Install">
  <a href="https://t.me/AlQaholic007">
    <img src="https://img.shields.io/badge/chat-on--telegram-%2310be9e.svg" alt="Free Install">
  </a>
  <img alt="CircleCI" src="https://img.shields.io/circleci/build/gh/und3fined-v01d/hydrabot/master?color=green&label=circleci&logo=circleci">
  <a href="https://codecov.io/gh/und3fined-v01d/hydrabot">
  <img src="https://codecov.io/gh/und3fined-v01d/hydrabot/branch/master/graph/badge.svg" />
  </a>
  <img alt="GitHub issues" src="https://img.shields.io/github/issues/und3fined-v01d/hydrabot?color=lightseagreen">
  <img alt="GitHub closed pull requests" src="https://img.shields.io/github/issues-pr-closed/und3fined-v01d/hydrabot">
  <img src=https://img.shields.io/badge/code_style-standard-brightgreen.svg>
</p>

> 🤖 **Hydrabot** is essentially Jarvis for your team's GitHub workflow.

Some examples of what you can do:

- [Manage labels](#commands).
- [Set reminders](#commands).
- Automatically [create a new branch when an issue is assigned](docs/create-issue-branch.md).
- Trigger [deployments](docs/deployment.md) with labels.
- Enforce [PR  conventions](docs/validators.md#pull-requests).
- Notify of [failed guidelines](docs/#issues) when opening an issue.
- Schedule [detection for obsolete (stale) issues and pull requests](#docs/staleness) and notify author and collaborators.
- Get [weekly project summaries](docs/hydrabot-stats.md).
- And [more to come](#roadmap)

---

**📖 Contents:** [Usage](#usage) ◦ [Configuration](#configuration) ◦ [Commands](#commands) ◦ [Hydrabot stats](#hydrabotstats) ◦ [Contributions](#contributions) ◦ [Roadmap](#roadmap) ◦ [Authors](#authors)

---


# Usage

1. Deploy your Hydrabot app instance
2. Install the Hydrabot GitHub App to your repository.
3. [Create](#configuration) your play(s) in a playbook.
4. Commit and push the playbook to your repository at `.github/hydrabot.yml`

> ☝ **NOTE:** Check [deploy hyrabot to your own server](docs/deploy.md) instructions for deploying your own Hydrabot instance.

# Configuration

**Hydrabot** is **unbarred** when it comes to being configurable.
Define your plays by creating a playbook as `.github/hydrabot.yml` file in your repository.

## Basics
The configuration, called a `playbook`, consists of any number of `plays`.

```yml
##
# automatically create branches when issues are assigned
##
branchName: # convention to name new branches when issues are assigned
branches:
  - label: {{label}} # you can have issues with certain label clone from different source branch
    name: {{source branch}} # name of the source branch, default is "default" branch of repository
    prefix: {{valid prefix}} # prefix for newly created branch
##
# automatically close issues that have lacking information from author
##
needsInfo:
  needsInfoLabel: {{label}} # issues needing information have this label
  closeComment: {{body}} # closing comment to close the issue
  daysUntilClose: {{days}} # days to wait before closing the issue
##
# automatically perform validations on issues and pull requests 
##
hydrabot:
  - when: {{event}}, {{event}} # can be one or more
    validate:
      # list of validators. Specify one or more.
      - do: {{validator}}
        {{option}}: # name of an option supported by the validator.
          {{sub-option}}: {{value}} # an option will have one or more sub-options.
    pass: # list of actions to be executed if all validation passes. Specify one or more. Omit this tag if no actions are needed.
      - do: {{action}}
    fail: # list of actions to be executed when at least one validation fails. Specify one or more. Omit this tag if no actions are needed.
      - do: {{action}}
    error: # list of actions to be executed when at least one validator throws an error. Specify one or more. Omit this tag if no actions are needed.
      - do: {{action}}
##
# automatically deploy when labels are assigned
##
deploy:
  {{label}}:
    environment: {{name}} # deploy to which github environment
    description: {{body}} # description for the environment
    transient_environment: {{ boolean }}
    auto_merge: {{ boolean }} # deploy even when merge conflict with default branch
    required_contexts:
      - {{context}} # required checks before deploying
    payload:
      port: {{ port number }}
      https: {{ boolean }}
```

### Create issue branch plays

```yml
branchName: tiny | short | full | custom
branches: 
  - label: enhancement
    name: dev
    prefix: feature/
```

Read more on [create issue branch configuration](docs/create-issue-branch.md)

### Deployment plays

```yml
deploy:
  deploy-to-test: # triggers deployment when this label given to PR
    environment: test # supported github environments
    description: testing environment # a description on environment
    transient_environment: true
    auto_merge: false # if true, triggers deploy even if merge conflict with master
    required_contexts: # required CI checks. If any fail, deployment is not triggered
      - continuous-integration/travis-ci/push
    payload:
      port: 8080
      https: true
```

Read more on [automated deployments with Hydrabot](docs/deployment.md)

### Validator plays

```yml
hydrabot:
  - when: {{event}}, {{event}} # can be one or more
    validate:
      # list of validators. Specify one or more.
      - do: {{validator}}
        {{option}}: # name of an option supported by the validator.
          {{sub-option}}: {{value}} # an option will have one or more sub-options.
    pass: # list of actions to be executed if all validation passes. Specify one or more. Omit this tag if no actions are needed.
      - do: {{action}}
    fail: # list of actions to be executed when at least one validation fails. Specify one or more. Omit this tag if no actions are needed.
      - do: {{action}}
    error: # list of actions to be executed when at least one validator throws an error. Specify one or more. Omit this tag if no actions are needed.
      - do: {{action}}
```
Read more on [validators, events and actions](docs/validators.md)


### Needs Info plays

```yml
needsInfo:
  daysUntilClose: 10
  # Label requiring a response
  needsInfoLabel: needs-info
  # Comment to post when closing an Issue for lack of response. Set to `false` to disable
  closeComment: >
    This issue has been automatically closed because there has been no response to our request for more information from the original author.
```
Read more on [auto-close issues lacking information with Hydrabot](docs/validators.md)

# Commands

## Label manager

Use the `/label` slash command to label an issue with a label

```
/label needs-info
```

Use the `/remove` slash command to label an issue with a comma delimited list of labels.

```
/remove needs-info
```

## Set Reminders

Hydrabot lets you set reminders to remind you for a particular event in the time provided by you. To do this you can use the Hydrabot `/remind` command.

```
/remind me to comment on the issue in 30 minutes
```

Hydrabot adds a `reminder` ⏰ label to the **issue** or **pull request** upon receiving this command and reminds you when the specified time has elapsed

Note: _These time intervals are counted based on the UTC time but will still be relevant_

# <a name="hydrabotstats"></a> Hydrabot stats

Weekly overview of a repositories history

![](docs/hydrabot-stats.png)

Read more about [weekly stats with Hydrabot](docs/hydrabot-stats.md)

# Support
Found a bug? Have a question? Or just want to chat?

- Contact me via email at [mail@sohamp.dev](mail@sohamp.dev).
- Create an [Issue](https://github.com/und3fined-v01d/hydrabot/issues/new).

# Contributions
We need your help:

- Have an **💡idea** for a **new feature**? Please [create a new issue](https://github.com/und3fined-v01d/hydrabot/issues) and tell us!
- **Fix a bug**, implement a new **validator** or **action** and [open a pull request](docs/CONTRIBUTING.md)!

> ☝️ **NOTE:** For development and testing. You'll want to [read about how to run it locally](docs/deploy.md#running-locally).

# Organisation-wide defaults

You can specify a default configuration to be applied across your GitHub organisation.
This can help reduce how many configuration files you need to maintain and make it easier
to get started with Hydrabot.

To add a default configuration:

1. Create a repository called `.github` in your organisation.
2. Create a file with the path `.github/hydrabot.yml` in this repository.

The final path of the file (including the repo name) should be `<YOUR_ORG>/.github/.github/hydrabot.yml`

Hydrabot will now use this file as the default when it cannot find one in a given
repository or PR. It determines the file to use in the following order:

1. A `hydrabot.yml` inside the PR.
2. A `hydrabot.yml` inside the repository the PR is for.
3. A `hydrabot.yml` at `<YOUR_ORG>/.github/.github/hydrabot.yml`.

**Note**: Hydrabot will only ever use a _single_ file. It does _not_ merge files.

## Why the weird default file path?

The Probots library that Hydrabot uses automatically searches for config files
in a repo named `.github` within the organisation.

The double nesting of the `<YOUR_ORG>/.github/.github/hydrabot.yml` default
file is unfortunately necessary. The GitHub app permissions model only lets you
specify a single path for your probot to access, so it must be the same as in
regular repositories.

# Roadmap
- Comment on issues/PRs when certain labels assigned
- Slack/Zulip integration
- Welcome new contributors

# Authors
  - Soham Parekh <@AlQaholic007, mail@sohamp.dev>
---
GPL, Copyright (c) 2020 [Soham Parekh](https://github.com/und3fined-v01d)

## Deploying

If you would like to run your own instance of this plugin, you can do so by forking this repo and deploying it to your own servers or run it locally.

[Create a GitHub App](https://github.com/settings/apps/new) and configure the permissions & events with the following:

**Settings:**
- GitHub app name - **Your app name**
- Webhook URL - **Your webhook url for listening to events** (for local deployments you can use [smee.io](https://smee.io/))
- Webhook secret - **Your generated webhook seceret** (GitHub app page has instructions on how to create this)

**Permissions:**
- Checks - **Read & Write**
- Contents - **Read & Write**
- Deployments - **Read & Write**
- Issues - **Read & Write**
- Metadata - **Read Only**
- Pull requests - **Read & Write**
- Commit Statuses - **Read & Write**
- Projects - **Read-Only**
- Single File - **Read-only**
  - Path: `.github/hydrabot.yml`

**And subscription to the following events:**
- [x] Issues
- [x] Issue comment
- [x] Label
- [x] Pull request
- [x] Pull request review comment
- [x] Pull request review


Make sure to create a private key for the app after it's been registered.

## Running Locally
1. Clone the forked repository on to your machine
2. Globally install smee-client from with npm ```npm install -g smee-client```
3. Go to [smee.io](https://smee.io) and create a new webhook OR use the cli by
   running the `smee` command.
4. Copy `.env.template` to a new file called `.env`, and fill it out.
5. Run `npm run dev` in your local repository
6. Add a repository for your Github app by going to [application settings](https://github.com/settings/installations)
7. Do a test pull request to check if everything is working

### Possible issues

####  `400 bad request` / `Error: No X-Hub-Signature found on request`

This happens when you haven't configured the webhook secret correctly in your
locally running instance. Make sure to set the `SECRET_TOKEN` environment variable
in `.env` before running `npm run dev`.

#### `ERROR probot: Integration not found`

This may occur when running Hydrabot using a GitHub Enterpise instance.

To fix, try making sure you've set the `GHE_HOST` variable in `.env` to the
hostname of your Enterprise instance. E.g. `GHE_HOST=github.your_company.com`.
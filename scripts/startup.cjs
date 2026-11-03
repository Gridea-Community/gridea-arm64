const { app } = require('electron')
const fs = require('fs')
const path = require('path')
app.setName('Gridea for ARM64')
// Preserve the preview profile name for upgrade compatibility; isolate from upstream Gridea.
if (!process.env.GRIDEA_TEST_HOME) {
  const home = path.join(app.getPath('appData'), 'Gridea ARM Preview')
  fs.mkdirSync(home, { recursive: true })
  const blog = path.join(home, 'Gridea')
  if (!fs.existsSync(blog)) fs.cpSync(path.join(process.resourcesPath, 'sample-blog'), blog, { recursive: true })
  const configDir = path.join(home, '.gridea')
  fs.mkdirSync(configDir, { recursive: true })
  const config = path.join(configDir, 'config.json')
  if (!fs.existsSync(config)) fs.writeFileSync(config, JSON.stringify({ sourceFolder: blog }))
  process.env.GRIDEA_TEST_HOME = home
}
process.on('uncaughtException', error => {
  console.error(error)
  app.exit(1)
})
require('./background.js')

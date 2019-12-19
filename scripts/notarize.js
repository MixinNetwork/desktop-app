require('dotenv').config()
const { notarize } = require('electron-notarize')

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }
  const appName = context.packager.appInfo.productFilename
  console.log('notarizing ' + appName)
  // eslint-disable-next-line no-return-await
  return await notarize({
    appBundleId: 'one.mixin.messenger',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
    ascProvider: process.env.APPLEIDASC
  })
}

// Sign a Windows app on macOS/Linux

// brew install openssl
// brew install osslsigncode

const exec = require('child_process').exec
const path = require('path')
const fs = require('fs')

const options = {
  certificate: 'path/to/certificate.pfx',
  certificateOutput: 'path/to/tmp/output_', // temporary output
  sign: 'path/to/unsigned.mixin.exe',
  output: 'path/to/mixin.exe',
  password: 'your_password',
  timestamp: 'http://timestamp.globalsign.com/scripts/timestamp.dll',
  name: 'Mixin App Name',
  url: 'http://mixin.one'
}

const executeCommandList = (list, callback) => {
  let index = -1

  const executeSubCommand = () => {
    index++

    const cmd = list[index]

    if (cmd) {
      executeCommand(cmd, executeSubCommand)
    } else {
      if (callback) {
        callback()
      }
    }
  }

  executeSubCommand()
}

const executeCommand = (cmd, callback) => {
  exec(cmd, (error, stdout, stderr) => {
    if (stdout && stdout.toString().length > 0) {
      console.log(stdout)
    }

    if (stderr && stderr.toString().length > 0) {
      console.log(stderr)
    }

    if (error !== null) {
      console.log(error)
    } else {
      if (callback) {
        callback()
      }
    }
  })
}

const signcode = (options, callback) => {
  const source = options.certificate
  const target = options.certificateOutput
  if (!fs.existsSync(target + 'output.key')) {
    const directory = path.dirname(target)
    if (directory !== '.') {
      exec(`mkdir -p ${directory}`, () => {})
    }

    const commands = []

    const password = options.password ? ' -password pass:' + options.password : ''

    commands.push(
      'openssl pkcs12' + ' -in ' + source + ' -nocerts -nodes' + ' -out ' + target + 'tmp_key.pem' + password
    )

    commands.push(
      'openssl pkcs12' + ' -in ' + source + ' -nokeys -nodes' + ' -out ' + target + 'tmp_cert.pem' + password
    )

    commands.push('openssl rsa' + ' -in ' + target + 'tmp_key.pem -outform DER' + ' -out ' + target + 'output.key')

    executeCommandList(commands, callback)
  } else {
    if (callback) {
      callback()
    }
  }
}

// run: yarn signapp
signcode(options, () => {
  const commands = []

  const out = options.output ? options.output : options.sign + '.out'

  const directory = path.dirname(out)
  if (directory !== '.') {
    exec(`mkdir -p ${directory}`, () => {})
  }

  commands.push(
    'osslsigncode sign' +
      ' -h sha256 ' +
      ' -n "' +
      options.name +
      '" -i "' +
      options.url +
      '" -t ' +
      options.timestamp +
      ' -certs ' +
      options.certificateOutput +
      'tmp_cert.pem' +
      ' -key ' +
      options.certificateOutput +
      'output.key' +
      ' -pass ' +
      options.password +
      ' -in ' +
      options.sign +
      ' -out ' +
      out
  )

  executeCommandList(commands, () => {
    if (!options.output) {
      fs.unlinkSync(options.sign)
      fs.renameSync(out, options.sign)
    }
  })
})

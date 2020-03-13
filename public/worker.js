const { parentPort } = require('worker_threads')

parentPort.once('message', payload => {
  console.log('handle---', payload)
  parentPort.postMessage('result data')
})

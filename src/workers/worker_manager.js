import interval from 'interval-promise'
import sendWorker from '@/workers/send_worker'
import receiveWorker from '@/workers/receive_worker'
import ackWorker from '@/workers/ack_worker'
import store from '@/store/store'
import { LinkStatus } from '@/utils/constants'
import { checkSignalKey } from '@/utils/signal_key_util'

const Status = {
  RUNNING: 0,
  STOP: 1
}

let ackLogTime = 0

class WorkManager {
  stoppedExternally = true
  workerStatus = []
  callback

  start() {
    if (this.stoppedExternally) {
      this.stoppedExternally = false
      this.workerStatus = []

      setInterval(() => {
        console.log('-----checkSignalKey interval')
        wasmObject.then(() => {
          checkSignalKey()
        })
      }, 86400000)

      interval(
        async(_, stop) => {
          this.workerStatus[0] = Status.RUNNING
          if (this.stoppedExternally) {
            stop()
            this.workerStatus[0] = Status.STOP
            this.check()
          }
          if (store.state.linkStatus === LinkStatus.CONNECTED) {
            await sendWorker.doWork()
          }
        },
        200,
        { stopOnError: false }
      )
      interval(
        async(_, stop) => {
          this.workerStatus[1] = Status.RUNNING
          if (this.stoppedExternally) {
            stop()
            this.workerStatus[1] = Status.STOP
            this.check()
          }
          if (store.state.linkStatus === LinkStatus.CONNECTED) {
            await receiveWorker.doWork()
          }
        },
        30,
        { stopOnError: false }
      )
      interval(
        async(_, stop) => {
          this.workerStatus[2] = Status.RUNNING
          if (this.stoppedExternally) {
            console.log('ackWorker Stop')
            stop()
            this.workerStatus[2] = Status.STOP
            this.check()
          }
          ackLogTime += 1
          if (store.state.linkStatus === LinkStatus.CONNECTED) {
            await ackWorker.doWork()
          } else if (ackLogTime % 10 === 0) {
            console.log('ackWorker linkStatus', store.state.linkStatus)
          }
        },
        500,
        { stopOnError: false }
      )
    }
  }

  check() {
    if (this.callback && this.workerStatus.length > 0) {
      const result = this.workerStatus.every(item => {
        return item === Status.STOP
      })
      if (result) {
        this.callback()
      }
    }
  }

  stop(callback) {
    this.stoppedExternally = true
    this.callback = callback
  }
}

export default new WorkManager()

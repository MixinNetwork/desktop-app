import interval from 'interval-promise'
import sendWorker from '@/workers/send_worker'
import receiveWorker from '@/workers/receive_worker'
import ackWorker from '@/workers/ack_worker'

const Status = {
  RUNNING: 0,
  STOP: 1
}

class WorkManager {
  stoppedExternally = true
  workerStatus = []
  callback

  start() {
    if (this.stoppedExternally) {
      this.stoppedExternally = false
      this.workerStatus = []

      interval(
        async(_, stop) => {
          this.workerStatus[0] = Status.RUNNING
          if (this.stoppedExternally) {
            stop()
            this.workerStatus[0] = Status.STOP
            this.check()
          }
          await sendWorker.doWork()
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
          await receiveWorker.doWork()
        },
        30,
        { stopOnError: false }
      )
      interval(
        async(_, stop) => {
          this.workerStatus[2] = Status.RUNNING
          if (this.stoppedExternally) {
            stop()
            this.workerStatus[2] = Status.STOP
            this.check()
          }
          await ackWorker.doWork()
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

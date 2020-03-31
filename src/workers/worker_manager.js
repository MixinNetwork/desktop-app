import { remote } from 'electron'
import fs from 'fs'
import path from 'path'
import interval from 'interval-promise'
import sendWorker from '@/workers/send_worker'
import receiveWorker from '@/workers/receive_worker'
import ackWorker from '@/workers/ack_worker'
import { mediaMigration } from '@/utils/attachment_util'
import { dbMigration } from '@/persistence/db_util'

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

      // TODO move to worker
      // this.migration()

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

  async migration() {
    const identityNumber = localStorage.mediaAndDbMigration
    if (identityNumber) {
      const newDir = path.join(remote.app.getPath('userData'), identityNumber)
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir)
      }

      await dbMigration(identityNumber)
      const count = await mediaMigration(identityNumber)
      console.log('mediaMigration count:', count)

      // TODO: remove old data
      // localStorage.mediaAndDbMigration = ''
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

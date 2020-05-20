import { v4 as uuidv4 } from 'uuid'
import BaseWorker from './base_worker'
import jobDao from '@/dao/job_dao'
import messageApi from '@/api/message'
import Vue from 'vue'
import participantDao from '@/dao/participant_dao'
import { getAccount } from '@/utils/util'
class AckWorker extends BaseWorker {
  async doWork() {
    await this.sendAckMessages()
    await this.sendSessionAckMessages()
    await this.sendRecallMessages()
  }

  async sendAckMessages() {
    const jobs = jobDao.findAckJobs()
    if (jobs.length <= 0) {
      return
    }
    const messages = jobs.map(function(item) {
      return JSON.parse(item.blaze_message)
    })

    await messageApi.acknowledgements(messages).then(
      async resp => {
        await jobDao.delete(jobs)
      },
      async error => {
        if (error.data.error.code === 403) {
          await jobDao.delete(jobs)
        } else {
          console.log(error)
        }
      })
  }

  async sendRecallMessages() {
    const job = jobDao.findRecallJob()
    if (!job) {
      return
    }
    const blazeMessage = {
      id: uuidv4(),
      action: 'CREATE_MESSAGE',
      params: {
        category: 'MESSAGE_RECALL',
        conversation_id: job.conversation_id,
        data: job.blaze_message,
        message_id: uuidv4()
      }
    }
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage).then(
      async _ => {
        await jobDao.deleteById(job.job_id)
      },
      async error => {
        if (error.code === 403) {
          await jobDao.deleteById(job.job_id)
        } else {
          console.log(error)
        }
      })
  }

  async sendSessionAckMessages() {
    const jobs = jobDao.findSessionAckJobs()
    if (jobs.length <= 0) {
      return
    }
    const account = getAccount()
    const userId = account.user_id
    const conversationId = participantDao.getRandomJoinConversationId(userId)
    const messages = jobs.map(function(item) {
      return JSON.parse(item.blaze_message)
    })

    const plainText = btoa(
      unescape(
        encodeURIComponent(
          JSON.stringify({
            action: 'ACKNOWLEDGE_MESSAGE_RECEIPTS',
            ack_messages: messages
          })
        )
      )
    )

    const blazeMessage = {
      id: uuidv4(),
      action: 'CREATE_MESSAGE',
      params: {
        category: 'PLAIN_JSON',
        conversation_id: conversationId,
        data: plainText,
        message_id: uuidv4(),
        recipient_id: userId,
        session_id: localStorage.primarySessionId
      }
    }
    await Vue.prototype.$blaze.sendMessagePromise(blazeMessage)
      .then(
        async _ => {
          await jobDao.delete(jobs)
        },
        async error => {
          if (error.code === 403) {
            await jobDao.delete(jobs)
          } else {
            console.log(error)
          }
        })
  }
}

export default new AckWorker()

import db from '@/persistence/db'
// @ts-ignore
import { v4 as uuidv4 } from 'uuid'

class JobDao {
  insert(job: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO jobs VALUES (@job_id, @action, @created_at,@order_id, @priority, @user_id, @blaze_message, @conversation_id, @resend_message_id, @run_count)'
    )
    stmt.run(job)
  }
  insertJobs(jobs: any) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO jobs VALUES (@job_id, @action, @created_at,@order_id, @priority, @user_id, @blaze_message, @conversation_id, @resend_message_id, @run_count)'
    )
    const insertMany = db.transaction((jobs: any) => {
      for (const item of jobs) {
        stmt.run(item)
      }
    })
    insertMany(jobs)
  }
  insertSendingJob(messageId: string, conversationId: string) {
    this.insert({
      job_id: uuidv4(),
      action: 'SENDING_MESSAGE',
      created_at: new Date().toISOString(),
      order_id: null,
      priority: 5,
      user_id: null,
      blaze_message: JSON.stringify({ messageId }),
      conversation_id: conversationId,
      resend_message_id: null,
      run_count: 0
    })
  }
  findAckJobs() {
    return db
      .prepare(`SELECT * FROM jobs WHERE action = 'ACKNOWLEDGE_MESSAGE_RECEIPTS' ORDER BY created_at ASC LIMIT 100`)
      .all()
  }
  findSessionAckJobs() {
    return db
      .prepare(`SELECT * FROM jobs WHERE action = 'CREATE_MESSAGE' ORDER BY created_at ASC LIMIT 100`).all()
  }
  findRecallJob() {
    return db.prepare(`SELECT * FROM jobs WHERE action = 'RECALL_MESSAGE'`).get()
  }
  findSendingJob() {
    return db.prepare(`SELECT * FROM jobs WHERE action = 'SENDING_MESSAGE'`).get()
  }
  delete(jobs: any) {
    const stmt = db.prepare('DELETE FROM jobs WHERE job_id = ?')
    const deleteMany = db.transaction((jobs: any) => {
      for (const job of jobs) {
        stmt.run(job.job_id)
      }
    })
    deleteMany(jobs)
  }
  deleteById(jobId: any) {
    db.prepare('DELETE FROM jobs WHERE job_id = ?').run(jobId)
  }
}

export default new JobDao()

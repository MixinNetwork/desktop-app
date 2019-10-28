import db from '@/persistence/db'

class JobDao {
  insert(job) {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO jobs VALUES (@job_id, @action, @created_at,@order_id, @priority, @user_id, @blaze_message, @conversation_id, @resend_message_id, @run_count)'
    )
    stmt.run(job)
  }
  findAckJobs() {
    return db
      .prepare(`SELECT * FROM jobs WHERE action = 'ACKNOWLEDGE_MESSAGE_RECEIPTS' ORDER BY created_at ASC LIMIT 100`)
      .all()
  }
  findSessionAckJobs() {
    return db.prepare(`SELECT * FROM jobs WHERE action = 'CREATE_MESSAGE' ORDER BY created_at ASC LIMIT 100`).all()
  }
  findRecallJob() {
    return db.prepare(`SELECT * FROM jobs WHERE action = 'RECALL_MESSAGE'`).get()
  }
  delete(jobs) {
    const stmt = db.prepare('DELETE FROM jobs WHERE job_id = ?')
    const deleteMany = db.transaction(jobs => {
      for (const job of jobs) {
        stmt.run(job.job_id)
      }
    })
    deleteMany(jobs)
  }
  deleteById(jobId) {
    db.prepare('DELETE FROM jobs WHERE job_id = ?').run(jobId)
  }
}

export default new JobDao()

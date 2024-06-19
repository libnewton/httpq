import { Queue } from 'bullmq';
import { logger } from './logger';
import { randomBytes } from 'crypto';
import { HTTPQjob } from './types';


const queue = new Queue(process.env.QUEUE_NAME ?? "httpq", {
    connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD ?? undefined,
        enableOfflineQueue: false
    
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 10_000
        }
    }
})
const encodeJobData = (job: HTTPQjob) => {
    if(!job.repeat_every && !job.repeat_pattern) {
        return randomBytes(16).toString("base64url")
    }
    let repeat_data = {}
    if(job.repeat_every) {
        repeat_data = {
            every: job.repeat_every.every * 1000,
            limit: job.repeat_every.limit
        }
    }
    if(job.repeat_pattern) {
        repeat_data = {
            pattern: job.repeat_pattern
        }
    }
    return randomBytes(16).toString("base64url") + "+" + Buffer.from(JSON.stringify(repeat_data)).toString("base64url") 
}
const decodeJobName = (inp: string) => {
    if(inp.includes("+")) {
        const [job_id, repeat_data] = inp.split("+") as [string, string]
        const repeated = JSON.parse(Buffer.from(repeat_data, "base64url").toString())
        return repeated
    }
    return null
}
export const addJob = async(job: HTTPQjob) => {
    const job_id = encodeJobData(job)
    try {
        const result = await queue.add(job_id, job, {
            delay: job.delay_seconds ? job.delay_seconds * 1000 : undefined,
            repeat: (job.repeat_pattern || job.repeat_every) ? {
                pattern: job.repeat_pattern ? job.repeat_pattern : undefined,
                every: job.repeat_every ? job.repeat_every.every * 1000 : undefined,
                limit: job.repeat_every ? job.repeat_every.limit : undefined
            } : undefined
            
        })
        return {
            job_name: job_id,
            job_id: result.id
        }
    } catch (err) {
        logger(`Failed to add job ${job_id} to queue`, 'error', {
            job, err
        })
        return false
    }

}
export const deleteJob = async(job_name: string, job_id: string) => {
    try {
        const repeat_data = decodeJobName(job_name)
        if(repeat_data) {
            await queue.removeRepeatable(job_name, repeat_data)
        } else {
            await queue.remove(job_id, {removeChildren: true})
        }
        return true
    } catch (err) {
        logger(`Failed to delete job ${job_name} from queue`, 'error', {
            job_name, job_id, err
        })
        return false
    }

}
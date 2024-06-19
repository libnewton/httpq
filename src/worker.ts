import { Worker, Job, UnrecoverableError } from 'bullmq';
import axios from 'axios';
import { logger } from './logger';
const axia = axios.create({
    baseURL: process.env.BACKEND_HOSTNAME || undefined,
    timeout: 10_000,
    validateStatus: null,
    headers: {
        'internal-auth': process.env.INTERNAL_AUTH_TOKEN
    }
})
const doRequest = async (path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', payload?: any) => {
    let response;
    try {
        response = await axia.request({
            url: path,
            method,
            data: payload
        })
        if(response.status >= 400) {
            logger(`Request failed with status ${response.status} and data ${response.data}`, 'error', {
                req: {
                    path,
                    method,
                    payload
                },
                res:{
                    status: response.status,
                    data: response.data
                }
            })
            if(response.status === 424) { // 424 is Failed Dependency. This is a permanent failure
                throw new UnrecoverableError(`Request permanently failed with status ${response.status} and data ${response.data}`)
            } else {
                throw new Error(`Request failed with status ${response.status} and data ${response.data}`)

            }

        }
    } catch (err) {
        logger(`Request failed with error ${err}`, 'error', {
            req: {
                path,
                method,
                payload
            },
            res:{
                status: response?.status,
                data: response?.data
            }
        })
        throw new Error(`Request failed with error ${err}`)
    }
}

const worker = new Worker(process.env.QUEUE_NAME ?? "httpq", async(job: Job) => {
    await doRequest(job.data.path, job.data.method, job.data.payload)

}, {
  concurrency: 1,
  removeOnComplete: {count: 100},
  removeOnFail: {count: 1000},

  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD ?? undefined
  },
  autorun: false
})
worker.run()
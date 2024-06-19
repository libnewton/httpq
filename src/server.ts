import Fastify, {FastifyRequest, FastifyReply, FastifyError} from 'fastify'
import middie, { NextFunction } from '@fastify/middie'
import { IncomingMessage,ServerResponse } from 'http'
import { HTTPQjob } from './types'
import { addJob, deleteJob } from './actions'

const app = Fastify({
  logger: true
})
const authMiddleware = async (req:IncomingMessage, res:ServerResponse, next: NextFunction) => {
    if(req.headers['internal-auth'] !== process.env.INTERNAL_AUTH_TOKEN) {
        res.writeHead(401)
        res.write('Unauthorized')
        res.end()
        return;
    } else {
        next()
    }
}


const addJobSchema = {
    type: 'object',
    properties: {
      path: { type: 'string' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        payload: { type: 'object' },
        delay_seconds: { type: 'number' },
        repeat_pattern: { type: 'string' },
        repeat_every: {
            type: 'object',
            properties: {
                limit: { type: 'number' },
                every: { type: 'number' }
            }
        }
    },
    required: ['path', 'method']
}
const deleteJobSchema = {
    type: 'object',
    properties: {
        job_id: { type: 'string' },
        job_name: { type: 'string' }
    },
    required: ['job_id', 'job_name']
}
const addJobHandler = async(req: FastifyRequest, reply: FastifyReply) => {
    const job = req.body as HTTPQjob
    const result = await addJob(job)
    if(result) {
        return reply.send(result)
    } else {
        return reply.status(500).send({error: 'Failed to add job'})
    }

}
const deleteJobHandler = async(req: FastifyRequest, reply: FastifyReply) => {
    const jobVals = req.body as {job_id: string, job_name: string}
    const result = await deleteJob(jobVals.job_name, jobVals.job_id)
    if(result) {
        return {success: true}
    } else {
        return reply.code(500).send({error: 'Failed to delete job'})
    }

}
const errorHandler = (error:FastifyError, request:FastifyRequest, reply: FastifyReply) => {
    request.log.error(error, `This error has status code ${error.statusCode}`)
    return reply.status(error.statusCode ?? 500).send(error)
}
async function main() {
    try {
        await app.register(middie)
        app.setErrorHandler(errorHandler)
        app.use(authMiddleware)
        app.post('/add', {schema: {body: addJobSchema}}, addJobHandler)
        app.post('/delete', {schema: {body: deleteJobSchema}}, deleteJobHandler)
        app.listen({port: parseInt(process.env.PORT || '3000'), host: '0.0.0.0'})
    
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}
main()
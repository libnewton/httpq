# HTTPQ: HTTP Queue

This is a simple HTTP Request scheduler based on [BullMQ](https://github.com/taskforcesh/bullmq) and Redis.

It is designed to send out HTTP requests at a later time, or instantly to realize a background job.

### Features
- Persistance
- Delayed Jobs
- Repeatable Jobs
- Retries with exponential backoff logic
- Delete Jobs
- Optional Sentry / GlitchTip integration
- Standalone and dockerized

### Setup
Simply clone the repository and deploy it with docker-compose.

Please adjust the environment variables (see `.env.examples`) to your needs.

You may also change the storage path for the Redis database in the `docker-compose.yml` file.

### Usage
- Outgoing requests have the `internal-auth` header set to the specified value.
- Incoming requests must have the `internal-auth` header set to the same value to be accepted.
#### Add a Job:
POST to `/add` with the following JSON body:
```js
{
  "url": "https://example.com/foo", // or /foo if you specified BACKEND_HOSTNAME
  "method": "POST", // POST, GET, DELETE, PUT are supported
  "payload": { // any json payload, optional
    "key": "value"
  },
  "delay_seconds": 10, // delay in seconds, optional
  "repeat_pattern": "* * * * * *", // cron pattern, optional, mutually exclusive with delay_seconds and repeat_every
  "repeat_every": { // repeatpattern, optional, mutually exclusive with delay_seconds and repeat_pattern
        "every": 10, // repeat every x seconds
        "limit": 10 // repeat x times
    }
}
```
Response:
```js
{
  "job_id": "...",
  "job_name": "..."
}
```

#### Delete a Job:
POST to `/delete` with the following JSON body:
```js
{
  "job_id": "...",
  "job_name": "..."
}
```
This returns 200 OK on success.

#### Retry logic
If the HTTP destination responds with a code >= 400, the job will be retried with an exponential backoff logic 3 times.

If you respond with code `424`, no retries will be attempted.

### License
MIT
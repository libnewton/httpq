import * as Sentry from "@sentry/node";

if(process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
    });
}
export const logger = (msg: string, level: Sentry.SeverityLevel, args?: any) => {
    if(process.env.SENTRY_DSN) {
        Sentry.captureMessage(msg, {level: 'info', extra: args})
    } else {
        console.warn(`[${level.toString()}] ` + msg, args)
    }
}

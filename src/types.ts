export type HTTPQjob = {
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    payload?: any,
    delay_seconds?: number,
    repeat_pattern?: string,
    repeat_every?: {limit: number, every: number}

}
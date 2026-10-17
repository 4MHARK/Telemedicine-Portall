import { describe, expect, it } from 'vitest'

import type { UploadTask } from '@/types'
import { initialUploadState, uploadReducer } from './reducer'

function task(overrides: Partial<UploadTask> = {}): UploadTask {
  return {
    id: 'task_1',
    fileName: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    progress: 0,
    status: 'queued',
    file: new File([new Uint8Array(8)], 'report.pdf', { type: 'application/pdf' }),
    ...overrides,
  }
}

const withTask = (t: UploadTask = task()) =>
  uploadReducer(initialUploadState, { type: 'ENQUEUE', task: t })

describe('uploadReducer', () => {
  it('enqueues tasks in order', () => {
    const one = withTask()
    const two = uploadReducer(one, { type: 'ENQUEUE', task: task({ id: 'task_2' }) })
    expect(two.tasks.map((t) => t.id)).toEqual(['task_1', 'task_2'])
  })

  it('starts a task: uploading, progress reset, failure cleared', () => {
    const failed = uploadReducer(
      withTask(task({ status: 'failed', failureReason: 'nope', progress: 40 })),
      { type: 'START', id: 'task_1' },
    )
    const started = uploadReducer(failed, { type: 'START', id: 'task_1' })
    expect(started.tasks[0]).toMatchObject({ status: 'uploading', progress: 0 })
    expect(started.tasks[0]?.failureReason).toBeUndefined()
  })

  it('records progress only while uploading', () => {
    const queued = withTask()
    expect(
      uploadReducer(queued, { type: 'PROGRESS', id: 'task_1', progress: 50 }).tasks[0]?.progress,
    ).toBe(0)

    const uploading = uploadReducer(queued, { type: 'START', id: 'task_1' })
    expect(
      uploadReducer(uploading, { type: 'PROGRESS', id: 'task_1', progress: 55 }).tasks[0]?.progress,
    ).toBe(55)
  })

  it('clamps progress to 0..100 and ignores non-finite values', () => {
    const uploading = uploadReducer(withTask(), { type: 'START', id: 'task_1' })
    expect(
      uploadReducer(uploading, { type: 'PROGRESS', id: 'task_1', progress: 180 }).tasks[0]
        ?.progress,
    ).toBe(100)
    expect(
      uploadReducer(uploading, { type: 'PROGRESS', id: 'task_1', progress: -20 }).tasks[0]
        ?.progress,
    ).toBe(0)
    expect(
      uploadReducer(uploading, { type: 'PROGRESS', id: 'task_1', progress: Number.NaN }).tasks[0]
        ?.progress,
    ).toBe(0)
  })

  it('marks success with the document id at 100%', () => {
    const done = uploadReducer(withTask(), { type: 'SUCCESS', id: 'task_1', documentId: 'doc_9' })
    expect(done.tasks[0]).toMatchObject({ status: 'uploaded', progress: 100, documentId: 'doc_9' })
  })

  it('marks failure with the reason', () => {
    const failed = uploadReducer(withTask(), {
      type: 'FAIL',
      id: 'task_1',
      reason: 'Simulated failure',
    })
    expect(failed.tasks[0]).toMatchObject({ status: 'failed', failureReason: 'Simulated failure' })
  })

  it('retries a failed task back to queued', () => {
    const failed = uploadReducer(withTask(), { type: 'FAIL', id: 'task_1', reason: 'x' })
    const retried = uploadReducer(failed, { type: 'RETRY', id: 'task_1' })
    expect(retried.tasks[0]).toMatchObject({ status: 'queued', progress: 0 })
    expect(retried.tasks[0]?.failureReason).toBeUndefined()
  })

  it('does not retry a task that has not failed', () => {
    const uploading = uploadReducer(withTask(), { type: 'START', id: 'task_1' })
    expect(uploadReducer(uploading, { type: 'RETRY', id: 'task_1' }).tasks[0]?.status).toBe(
      'uploading',
    )
  })

  it('removes by id and ignores unknown ids', () => {
    const removed = uploadReducer(withTask(), { type: 'REMOVE', id: 'task_1' })
    expect(removed.tasks).toHaveLength(0)
    expect(uploadReducer(withTask(), { type: 'REMOVE', id: 'nope' }).tasks).toHaveLength(1)
  })

  it('clears only completed tasks', () => {
    let state = withTask(task({ id: 'a' }))
    state = uploadReducer(state, { type: 'ENQUEUE', task: task({ id: 'b' }) })
    state = uploadReducer(state, { type: 'ENQUEUE', task: task({ id: 'c' }) })
    state = uploadReducer(state, { type: 'SUCCESS', id: 'a', documentId: 'd1' })
    state = uploadReducer(state, { type: 'FAIL', id: 'b', reason: 'x' })

    expect(uploadReducer(state, { type: 'CLEAR_COMPLETED' }).tasks.map((t) => t.id)).toEqual([
      'b',
      'c',
    ])
  })

  it('keeps the File reference through every transition', () => {
    const file = new File([new Uint8Array(4)], 'keep.pdf', { type: 'application/pdf' })
    let state = withTask(task({ file }))
    state = uploadReducer(state, { type: 'START', id: 'task_1' })
    state = uploadReducer(state, { type: 'FAIL', id: 'task_1', reason: 'x' })
    expect(state.tasks[0]?.file).toBe(file)
  })

  it('never mutates the previous state', () => {
    const previous = withTask()
    uploadReducer(previous, { type: 'START', id: 'task_1' })
    uploadReducer(previous, { type: 'REMOVE', id: 'task_1' })
    expect(previous.tasks).toHaveLength(1)
    expect(previous.tasks[0]?.status).toBe('queued')
  })
})

import type { MutableRefObject } from 'react'
import { Methods } from '@safe-global/safe-apps-sdk'
import AppCommunicator from './AppCommunicator'

describe('AppCommunicator', () => {
  it('ignores messages coming from an unexpected origin', async () => {
    const postMessage = jest.fn()
    const contentWindow = { postMessage }
    const iframeRef = {
      current: {
        contentWindow,
        src: 'https://app.safe.global/frame',
      },
    } as unknown as MutableRefObject<HTMLIFrameElement | null>

    const communicator = new AppCommunicator(iframeRef)
    const handler = jest.fn().mockReturnValue({ safeAddress: '0x123' })
    communicator.on(Methods.getSafeInfo, handler)

    await communicator.handleIncomingMessage({
      source: contentWindow,
      origin: 'https://evil.example',
      data: {
        id: '1',
        method: Methods.getSafeInfo,
      },
    } as any)

    expect(handler).not.toHaveBeenCalled()

    communicator.clear()
  })

  it('posts responses to the iframe origin instead of wildcard origin', () => {
    const postMessage = jest.fn()
    const contentWindow = { postMessage }
    const iframeRef = {
      current: {
        contentWindow,
        src: 'https://app.safe.global/frame',
      },
    } as unknown as MutableRefObject<HTMLIFrameElement | null>

    const communicator = new AppCommunicator(iframeRef)

    communicator.send({ ok: true }, 'request-id')

    expect(postMessage).toHaveBeenCalledWith(expect.any(Object), 'https://app.safe.global')

    communicator.clear()
  })
})

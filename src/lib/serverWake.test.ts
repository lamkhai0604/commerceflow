import axios from 'axios';
import { act, renderHook } from '@testing-library/react';
import { isServerWaking, useServerWaking, withWakeRetry } from './serverWake';

const wakeError = (status?: number) =>
  new axios.AxiosError('failed', 'ERR', undefined, undefined, status ? { status, data: '', statusText: '', headers: {}, config: {} as never } : undefined);

test('retries gateway failures while the server wakes, showing the notice until it answers', async () => {
  let clock = 0;
  const { result } = renderHook(() => useServerWaking());
  const request = vi.fn()
    .mockRejectedValueOnce(wakeError(504))
    .mockRejectedValueOnce(wakeError())
    .mockResolvedValueOnce('ok');
  const states: boolean[] = [];
  const sleep = async () => { states.push(isServerWaking()); clock += 3000; };
  await act(async () => { await expect(withWakeRetry(request, { sleep, now: () => clock })).resolves.toBe('ok'); });
  expect(request).toHaveBeenCalledTimes(3);
  expect(states).toEqual([true, true]);
  expect(result.current).toBe(false);
});

test('gives up after the retry budget and clears the notice', async () => {
  let clock = 0;
  const request = vi.fn().mockRejectedValue(wakeError(503));
  await expect(withWakeRetry(request, { budgetMs: 9000, sleep: async () => { clock += 3000; }, now: () => clock })).rejects.toBeTruthy();
  expect(request).toHaveBeenCalledTimes(4);
});

test('does not retry ordinary failures such as not found or bad requests', async () => {
  for (const status of [400, 401, 404, 500]) {
    const request = vi.fn().mockRejectedValue(wakeError(status));
    await expect(withWakeRetry(request, { sleep: async () => undefined })).rejects.toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  }
});

import { describe, expect, it } from 'vitest';
import { clientLoader } from './app.contacts';

describe('app.contacts route', () => {
  it('normalizes invalid params to the default slice', async () => {
    const result = await clientLoader({
      request: new Request(
        'http://localhost:5173/app/contacts?page=0&pageSize=999&contactId=',
      ),
    });

    expect(result).toEqual({
      page: 1,
      pageSize: 50,
      contactId: null,
    });
  });

  it('preserves valid page, pageSize and contactId params', async () => {
    const result = await clientLoader({
      request: new Request(
        'http://localhost:5173/app/contacts?page=3&pageSize=10&contactId=contact-7',
      ),
    });

    expect(result).toEqual({
      page: 3,
      pageSize: 10,
      contactId: 'contact-7',
    });
  });
});

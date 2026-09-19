import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invitationUrl, readInvitation } from '../client/src/invitations';
test('invitations preserve case and do not leak session parameters', () => {
  const url = invitationUrl('https://example.test/?token=secret', 'aB_9-z');
  assert.equal(url, 'https://example.test/?room=aB_9-z');
  assert.equal(readInvitation(new URL(url).search), 'aB_9-z');
  assert.equal(readInvitation('?room=../bad'), '');
});

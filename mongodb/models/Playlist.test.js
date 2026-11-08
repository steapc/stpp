const assert = require('node:assert/strict');
const test = require('node:test');
const Playlist = require('./Playlist');

test('playlist schema requires title and owner', async () => {
  await assert.rejects(new Playlist({}).validate(), (error) => {
    assert.ok(error.errors.title);
    assert.ok(error.errors.owner);
    return true;
  });
});

test('playlist keeps tracks as embedded documents with their own ids', async () => {
  const playlist = new Playlist({
    title: 'Вечерний джаз',
    owner: 'student@example.com',
    tracks: [{ title: 'Blue Hour', artist: 'Jazz Collective', durationSec: 276 }]
  });
  await playlist.validate();

  assert.equal(playlist.isPublic, true);
  assert.equal(playlist.listenersOnline, 0);
  assert.equal(playlist.tracks.length, 1);
  assert.ok(playlist.tracks[0]._id);
});

test('track duration must be a non-negative integer', async () => {
  const negativeDuration = new Playlist({
    title: 'Test',
    owner: 'student',
    tracks: [{ title: 'Track', artist: 'Artist', durationSec: -1 }]
  });
  const fractionalDuration = new Playlist({
    title: 'Test',
    owner: 'student',
    tracks: [{ title: 'Track', artist: 'Artist', durationSec: 1.5 }]
  });

  await assert.rejects(negativeDuration.validate(), (error) => {
    assert.ok(error.errors['tracks.0.durationSec']);
    return true;
  });
  await assert.rejects(fractionalDuration.validate(), (error) => {
    assert.ok(error.errors['tracks.0.durationSec']);
    return true;
  });
});

test('playlist rejects fields outside its schema', () => {
  assert.throws(
    () => new Playlist({ title: 'Test', owner: 'student', unexpected: true }),
    /unexpected/
  );
});

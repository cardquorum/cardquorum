# Changes

## Minor Features

1. Bug fixes
   1. When you call your own ace, you must follow with that ace, the jig is up
   2. Predetermined picker-partner variants should not show who the partner is until their card is revealed
   3. who took in bg (?)
   4. Unknown ace doesn't work: failed to select the 6 of spades.
   5. OICD urls should not care about a trailing `/`
2. Build Fixes
   1. Dependabot can't handle pnpm 12 yet
   2. Other failures and things to optimize in CI

## Major Features

1. Spectator view
2. Replay omnicient view
3. Replay and Summary access permissions
4. Admin view
   1. Flag(?) col on Users table
   2. Additional page in menu, control other users (mainly reset basic auth password)
5. Notifications - on friend request/accept, room invite...

## Platform & Misc

1. Schema renaming
2. Both extend and prune the test suite
3. Thorough security and code quality review
4. Wipe db migrations
5. Versioning
6. Actually robust documentation
7. 404 Page
8. Copyright/TOS/Privacy Policy

## Dependabot Fix

When Dependabot releases their fix to support pnpm 12, update `package.json`:

```json
  "name": "@cardquorum/source",
  "version": "0.0.0",
  "license": "AGPL-3.0",
  "packageManager": "pnpm@12.4.1", // add this line
```

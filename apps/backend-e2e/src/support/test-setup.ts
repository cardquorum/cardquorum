import axios from 'axios';

/*
 * Runs once per test file, before that file's tests.
 *
 * The Jest version of this file assigned `module.exports = async function` and
 * was therefore a no-op: setupFiles are executed, not invoked. baseURL was
 * never actually applied. This went unnoticed because CI runs `nx affected -t
 * test`, and this project's target is named `e2e`.
 */
const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ?? '3000';

axios.defaults.baseURL = `http://${host}:${port}`;

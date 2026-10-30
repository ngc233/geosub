/* Local DB integration: the real login action and admin-auth module run inside one
 * rolled-back transaction. Only cookies, request headers and redirect are mocked. */
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const req = createRequire(path.join(process.cwd(), 'package.json'));
const ts = req('typescript');
const { PrismaClient } = req('@prisma/client');
const { PrismaPg } = req('@prisma/adapter-pg');
const url = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(url.hostname));
assert(/^\/geosub_release_\d{8}$/.test(url.pathname));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function load(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', source)((name) => name in mocks ? mocks[name] : req(name), module.exports, module);
  return module.exports;
}

class Redirect extends Error { constructor(location) { super(location); this.location = location; } }

function browser() {
  const jar = new Map();
  return {
    jar,
    store: {
      get: (name) => jar.has(name) ? { name, value: jar.get(name).value } : undefined,
      set: (name, value, options) => { jar.set(name, { value, options }); },
      delete: (name) => { jar.delete(name); },
    },
  };
}

(async () => {
  const sentinel = new Error('intentional integration rollback');
  let checks = 0;
  try {
    await db.$transaction(async (tx) => {
      const request = { store: null, ip: '' };
      const nextHeaders = { cookies: async () => request.store, headers: async () => new Headers({ 'x-real-ip': request.ip }) };
      const navigation = { redirect: (location) => { throw new Redirect(location); } };
      const prisma = { ...tx, $transaction: (work) => typeof work === 'function' ? work(tx) : Promise.all(work) };
      const permissions = load(path.resolve('lib/admin-permissions.ts'), {});
      const auth = load(path.resolve('lib/admin-auth.ts'), { 'server-only': {}, 'next/headers': nextHeaders, 'next/navigation': navigation, './prisma': { prisma }, './admin-permissions': permissions });
      const clientIp = load(path.resolve('lib/client-ip.ts'), {});
      const actions = load(path.resolve('app/admin-login/actions.ts'), { 'next/headers': nextHeaders, 'next/navigation': navigation, '../../lib/prisma': { prisma }, '../../lib/admin-auth': auth, '../../lib/client-ip': clientIp });

      async function login(who, ip, email, password) {
        request.store = who.store; request.ip = ip;
        const form = new FormData(); form.set('email', email); form.set('password', password);
        try { await actions.loginAction(form); } catch (error) { if (error instanceof Redirect) return error.location; throw error; }
        throw new Error('login action must redirect');
      }
      const PASSWORD = 'Correct-Horse-Battery-9!';
      async function admin() {
        const email = `trusted-${randomUUID()}@invalid.example`;
        const user = await tx.adminUser.create({ data: { email, passwordHash: auth.hashPassword(PASSWORD), status: 'ACTIVE' } });
        return { ...user, email };
      }
      let fakeIp = 0;
      const attackerIp = () => `198.51.100.${++fakeIp}`;
      async function lockAccount(email) {
        const attacker = browser();
        for (let n = 0; n < 8; n += 1) assert.equal(await login(attacker, attackerIp(), email, 'wrong-password-123'), '/admin-login?error=invalid');
        assert.equal(await login(attacker, attackerIp(), email, PASSWORD), '/admin-login?error=throttled', 'eight failures lock the account for untrusted sources');
      }
      const devices = (userId) => tx.adminTrustedDevice.findMany({ where: { userId } });

      // 1. A successful login stores only a hash and sets a hardened device cookie.
      const owner = await admin();
      const laptop = browser();
      assert.equal(await login(laptop, '203.0.113.1', owner.email, PASSWORD), '/admin');
      const cookie = laptop.jar.get('geosub_admin_device');
      assert.match(cookie.value, /^[0-9a-f]{64}$/);
      assert.equal(cookie.options.httpOnly, true);
      assert.equal(cookie.options.sameSite, 'lax');
      assert(cookie.options.expires.getTime() > Date.now() + 29 * 86400_000);
      const [stored] = await devices(owner.id);
      assert.notEqual(stored.tokenHash, cookie.value);
      assert.equal(stored.tokenHash.length, 64);
      checks++;

      // 2. Failures from elsewhere lock the account, but the trusted browser still signs in.
      await lockAccount(owner.email);
      assert.equal(await login(browser(), attackerIp(), owner.email, PASSWORD), '/admin-login?error=throttled');
      assert.equal(await login(laptop, '203.0.113.1', owner.email, PASSWORD), '/admin');
      assert.equal((await devices(owner.id)).length, 1, 'a returning device is refreshed, not duplicated');
      checks++;

      // 3. A device cookie only vouches for its own account.
      const colleague = await admin();
      await lockAccount(colleague.email);
      assert.equal(await login(laptop, '203.0.113.1', colleague.email, PASSWORD), '/admin-login?error=throttled');
      checks++;

      // 4. The per-IP limit still applies to trusted devices.
      const second = await admin();
      const tablet = browser();
      assert.equal(await login(tablet, '203.0.113.50', second.email, PASSWORD), '/admin');
      for (let n = 0; n < 5; n += 1) await login(browser(), '203.0.113.60', `noise-${n}@invalid.example`, 'wrong-password-123');
      assert.equal(await login(tablet, '203.0.113.60', second.email, PASSWORD), '/admin-login?error=throttled');
      checks++;

      // 5. Five wrong passwords on a trusted device revoke its trust.
      await lockAccount(owner.email);
      for (let n = 0; n < 5; n += 1) assert.equal(await login(laptop, `192.0.2.${n + 1}`, owner.email, 'wrong-password-123'), '/admin-login?error=invalid');
      assert.equal((await devices(owner.id)).length, 0, 'device trust is revoked after five failures');
      assert.equal(await login(laptop, '192.0.2.99', owner.email, PASSWORD), '/admin-login?error=throttled');
      checks++;

      // 6. Expired devices are ignored.
      const expiring = await admin();
      const phone = browser();
      assert.equal(await login(phone, '203.0.113.70', expiring.email, PASSWORD), '/admin');
      await tx.adminTrustedDevice.updateMany({ where: { userId: expiring.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await lockAccount(expiring.email);
      assert.equal(await login(phone, '203.0.113.70', expiring.email, PASSWORD), '/admin-login?error=throttled');
      assert.equal(auth.isTrustedDeviceUsable({ userId: 'a', expiresAt: new Date(Date.now() + 1000), failureCount: 4 }, 'a'), true);
      assert.equal(auth.isTrustedDeviceUsable({ userId: 'a', expiresAt: new Date(Date.now() + 1000), failureCount: 5 }, 'a'), false);
      assert.equal(auth.isTrustedDeviceUsable(null, 'a'), false);
      checks++;

      // 7. At most ten devices per account; the least recently used are dropped.
      const busy = await admin();
      for (let n = 0; n < 12; n += 1) assert.equal(await login(browser(), `203.0.113.${100 + n}`, busy.email, PASSWORD), '/admin');
      assert.equal((await devices(busy.id)).length, 10);
      checks++;

      // 8. Disabled accounts gain nothing from an earlier trusted device.
      const leaver = await admin();
      const desk = browser();
      assert.equal(await login(desk, '203.0.113.80', leaver.email, PASSWORD), '/admin');
      await lockAccount(leaver.email);
      await tx.adminUser.update({ where: { id: leaver.id }, data: { status: 'DISABLED' } });
      assert.equal(await login(desk, '203.0.113.80', leaver.email, PASSWORD), '/admin-login?error=throttled');
      checks++;

      // 9. Changing the password revokes every trusted device and records it in the audit log.
      const rotating = await admin();
      const home = browser();
      assert.equal(await login(home, '203.0.113.90', rotating.email, PASSWORD), '/admin');
      assert.equal(await login(browser(), '203.0.113.91', rotating.email, PASSWORD), '/admin');
      assert.equal((await devices(rotating.id)).length, 2);
      request.store = home.store;
      const changed = await auth.changeCurrentAdminPassword({ userId: rotating.id, currentPassword: PASSWORD, newPassword: 'Another-Strong-Pass-42!' });
      assert.equal(changed.ok, true);
      assert.equal((await devices(rotating.id)).length, 0);
      const [audit] = await tx.auditLog.findMany({ where: { actorId: rotating.id, action: 'change_password' } });
      assert.equal(audit.newValue.trustedDevicesRevoked, 2);
      checks++;

      throw sentinel;
    }, { timeout: 120_000, maxWait: 10_000 });
  } catch (error) {
    if (error !== sentinel) throw error;
  } finally {
    await db.$disconnect();
  }
  assert.equal(checks, 9);
  console.log(JSON.stringify({ checks, scope: 'real login action + admin-auth on local PG', transaction: 'rolled back', productionTouched: false }));
})().catch((error) => { console.error(error); process.exitCode = 1; });

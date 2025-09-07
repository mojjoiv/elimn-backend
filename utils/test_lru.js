const LRU = require('./lru');

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
  console.log('Create LRU(capacity=3, defaultTTL=200ms)...');
  const cache = new LRU(3, { defaultTTL: 200 });

  cache.put('a', 1);
  cache.put('b', 2);
  cache.put('c', 3);
  console.log('Keys after inserts (mru->lru):', cache.keys());

  console.log('Access b -> should move to head');
  cache.get('b');
  console.log('Keys:', cache.keys());

  console.log('Insert d (evict LRU c)');
  cache.put('d', 4);
  console.log('Keys:', cache.keys());

  console.log('Wait 250ms for TTL expiration (defaultTTL=200ms)');
  await sleep(250);
  console.log('Get a (should be expired && removed):', cache.get('a'));
  console.log('Keys after expiry cleanup:', cache.keys());

  console.log('Test per-item TTL');
  cache.put('x', 'X', 500);
  console.log('Get x immediately:', cache.get('x'));
  await sleep(600);
  console.log('Get x after 600ms (should be undefined):', cache.get('x'));

  console.log('All tests finished. Final stats:', cache.stats());
}

runTests().catch(err => {
  console.error('Test failed', err);
  process.exit(1);
});

const { loadRestaurantsData } = require('./test-module.js');

async function run() {
  const data = await loadRestaurantsData(null, 'Paris', '2026-02');
  console.log(`Results for Paris 2026-02: ${data.length}`);
}
run();

import fetch from 'node-fetch';
global.fetch = fetch;

import { movementEngine } from '../src/services/MovementEngine.js';

async function run() {
    console.log("🚀 Testing MovementEngine...");
    const results = await movementEngine.fetchParisMovements();
    
    console.log(`✅ Fetched ${results.length} total geocoded movements for Paris!`);
    
    if (results.length > 0) {
        console.log("Sample Result:");
        console.log(JSON.stringify(results[0], null, 2));
    } else {
        console.log("❌ No results found. Something might be wrong.");
    }
}

run().catch(console.error);

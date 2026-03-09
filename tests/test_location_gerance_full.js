import fetch from 'node-fetch';
global.fetch = fetch;

import { fetchBodaccLocationGerances } from '../src/utils/bodaccParser.js';

async function run() {
    console.log("🚀 Testing Full Location-Gérance Logic...");
    const results = await fetchBodaccLocationGerances({ zipCode: '', city: 'Paris', limit: 20 });
    
    console.log(`\nFound ${results.length} results.`);
    if (results.length > 0) {
        console.log("\nSample Top 3 Results:");
        for(let i = 0; i < Math.min(3, results.length); i++) {
           console.log(`Date: ${results[i].date} | Type: ${results[i].type} | Enseigne: ${results[i].enseigne}`);
        }
    }
}
run();

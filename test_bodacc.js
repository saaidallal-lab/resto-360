import { fetchBodaccLiquidations, fetchBodaccSales } from './src/utils/bodaccParser.js';

async function test() {
    console.log("Fetching BODACC Liquidations...");
    const data = await fetchBodaccLiquidations('75011', 2);
    console.log(JSON.stringify(data, null, 2));
}

test();

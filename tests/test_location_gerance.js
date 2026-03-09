import fetch from 'node-fetch';
global.fetch = fetch;

async function run() {
    const baseUrl = 'https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales';
    let url = `${baseUrl}&q=location-gérance&rows=1`;
    const response = await fetch(url);
    const json = await response.json();
    console.log(JSON.stringify(json.records[0].fields, null, 2));
}
run();

import fetch from 'node-fetch';
global.fetch = fetch;

async function run() {
    const baseUrl = 'https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales';
    let url = `${baseUrl}&q="location-gérance" (restaurant OR restauration OR brasserie OR cafe)&rows=5`;
    const response = await fetch(url);
    const json = await response.json();
    console.log(`Found ${json.nhits} restaurants in location-gerance`);
    for (let i = 0; i < Math.min(3, json.records.length); i++) {
        console.log(`\n--- Record ${i + 1} ---`);
        const f = json.records[i].fields;
        console.log("Activite:", f.activite);
        console.log("Commercial:", f.commercial);
        console.log("Famille:", f.familleavis_lib);
        console.log("ListePersonnes:", f.listepersonnes);
    }
}
run();

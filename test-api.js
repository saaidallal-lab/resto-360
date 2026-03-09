async function test() {
  const url = 'https://dgal.opendatasoft.com/api/records/1.0/search/?dataset=export_alimconfiance&rows=20&sort=date_inspection&refine.synthese_eval_sanit=A%20am%C3%A9liorer';
  const res = await fetch(url);
  const json = await res.json();
  if (json.records && json.records.length > 0) {
    console.log('Oldest sample dates:', json.records.slice(0, 5).map(r => r.fields.date_inspection));
  }

  const url2 = 'https://dgal.opendatasoft.com/api/records/1.0/search/?dataset=export_alimconfiance&rows=20&sort=-date_inspection&refine.synthese_eval_sanit=A%20am%C3%A9liorer';
  const res2 = await fetch(url2);
  const json2 = await res2.json();
  if (json2.records && json2.records.length > 0) {
    console.log('Newest sample dates:', json2.records.slice(0, 5).map(r => r.fields.date_inspection));
  }
}
test();

import { DatabaseSync } from 'node:sqlite';
function show(f, q) {
  const db = new DatabaseSync(f, { readOnly: true });
  try {
    const rows = db.prepare(q).all();
    console.log('--- ' + f + ' :: ' + q);
    console.log(JSON.stringify(rows, null, 2).slice(0, 4000));
  } catch (e) { console.log(f, e.message); }
}
show('server/data/doktor.db', "select key, substr(value,1,40) as vpreview from app_config");
show('server/data/doktor.db', "select provider, substr(access_token,1,12) as tok, connected, scope from oauth_tokens");

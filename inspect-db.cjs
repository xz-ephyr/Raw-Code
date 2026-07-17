const D = require('better-sqlite3');
const files = ['server/data/doktor.db', 'server/data/raw-code.db'];
for (const f of files) {
  try {
    const db = new D(f, { readonly: true });
    const tabs = db.prepare("select name from sqlite_master where type='table'").all().map(r => r.name);
    console.log('=== ' + f + ' tables: ' + tabs.join(', '));
    for (const t of tabs) {
      try {
        const cols = db.prepare('pragma table_info(' + JSON.stringify(t) + ')').all().map(c => c.name);
        console.log('  ' + t + ' (' + cols.join(', ') + ')');
      } catch (e) { console.log('  ' + t + ' pragma err ' + e.message); }
    }
  } catch (e) { console.log(f, 'ERR', e.message); }
}

import Database from '@replit/database';

const db = new Database()

db.list().then (keys => { keys.forEach ((key) => { db.delete (key); }); })

console.log('done!');
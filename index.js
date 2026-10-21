import express from 'express';
import * as bs from "better-sqlite3";

const app = express();

const db = new bs('user.db');
db.pragma('journal_mode = WAL');

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.listen(8080, () => console.log("서버 시작됨: http://localhost:8080"));

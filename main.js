import express from "express";
import sqlite from "node:sqlite";

const db = new sqlite.Database("user.db");

db.exec(`CREATE TABLE IF NOT EXISTS user (
  username TEXT PRIMARY KEY NOT NULL,
  password TEXT NOT NULL
)`);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use((_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
})

app.post("/signin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).send({ message: "아이디와 비밀번호를 모두 입력해주세요." });
    return;
  }

  const statement = `SELECT * FROM user WHERE username = '${username}' AND password = '${password}'`;

  try {
    const result = db.prepare(statement).all();
    if (!result[0]) {
      res.status(401).send({ message: "아이디와 비밀번호가 일치하지 않습니다." });
      return;
    }

    res.status(200).send({ message: "로그인 성공" });
  } catch (error) {
    res.status(500).send({ error });
  }
});
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const statement = `INSERT INTO user (username, password) VALUES ('${username}', '${password}')`;

  try {
    db.prepare(statement).run();
    res.status(200).send({ message: "회원가입 성공" });
  } catch (error) {
    if (error.errcode === 1555) { // Constraint failed
      res.status(409).send({ message: "이미 존재하는 아이디입니다." });
      return;
    }

    res.status(500).send({ error });
  }
});

app.listen(8080, () => console.log("서버 시작됨: http://localhost:8080"));
process.on("exit", () => db.close());

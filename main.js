import express from "express";
import sqlite from "node:sqlite";
import session from "express-session";
import cookieParser from "cookie-parser";

const db = new sqlite.Database("database.db");

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
});
app.use(
  session({
    secret: "abcdefg",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 /* 밀리초(ms) */ },
  }),
);
app.use(cookieParser());

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
      res
        .status(401)
        .send({ message: "아이디와 비밀번호가 일치하지 않습니다." });
      return;
    }

    req.session.username = username;
    req.session.save((err) => {
      if (err) throw err;

      res.cookie("username", username, {
        maxAge: 1000 * 60 * 60,
      });
      res.redirect("/");
    });
  } catch (error) {
    res.status(500).send({ error });
  }
});
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const statement = `INSERT INTO user (username, password) VALUES ('${username}', '${password}')`;

  try {
    db.prepare(statement).run();
    res.redirect("/signin.html");
  } catch (error) {
    // Constraint failed
    if (error.errcode === 1555) {
      res.status(409).send({ message: "이미 존재하는 아이디입니다." });
      return;
    }

    res.status(500).send({ error });
  }
});
app.get("/signout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res
        .status(500)
        .send({
          error: err,
          message: "세션을 삭제하는 도중 오류가 발생했습니다.",
        });
      return;
    }

    res.clearCookie("username");
    res.redirect("/");
  });
});

app.listen(8080, () => console.log("서버 시작됨: http://localhost:8080"));
process.on("exit", () => db.close());

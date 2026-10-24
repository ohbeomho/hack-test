import express from "express"
import sqlite from "node:sqlite"
import session from "express-session"
import path from "path"

const db = new sqlite.Database("database.db")

db.exec(`CREATE TABLE IF NOT EXISTS user (
  username TEXT PRIMARY KEY NOT NULL,
  password TEXT NOT NULL
)`)
db.exec(`CREATE TABLE IF NOT EXISTS post (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL
)`)

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/static", express.static("static"))
app.use(
    session({
        secret: "abcdefg",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 /* 밀리초(ms) */ },
    }),
)

app.set("view engine", "ejs")
app.set("views", path.join("./views"))

app.get("/", (req, res) => {
    const statement = `SELECT * FROM post ORDER BY created_at DESC`

    try {
        const posts = db.prepare(statement).all()
        res.render("index", { username: req.session.username, posts })
    } catch (error) {
        res.status(500).send({ error })
    }
})
app.get("/signin", (_req, res) => res.render("signin"))
app.get("/signup", (_req, res) => res.render("signup"))
app.get('/create-post', (_req, res) => res.render("create-post"))

app.post("/signin", (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        res.status(400).send({
            message: "아이디와 비밀번호를 모두 입력해주세요.",
        })
        return
    }

    const statement = `SELECT * FROM user WHERE username = '${username}' AND password = '${password}'`

    try {
        const result = db.prepare(statement).all()
        if (!result[0]) {
            res.status(401).send({
                message: "아이디와 비밀번호가 일치하지 않습니다.",
            })
            return
        }

        req.session.username = username
        req.session.save((err) => {
            if (err) throw err

            res.cookie("username", username, {
                maxAge: 1000 * 60 * 60,
            })
            res.redirect("/")
        })
    } catch (error) {
        res.status(500).send({ error })
    }
})
app.post("/signup", (req, res) => {
    const { username, password } = req.body
    const statement = `INSERT INTO user (username, password) VALUES ('${username}', '${password}')`

    try {
        db.prepare(statement).run()
        res.redirect("/signin")
    } catch (error) {
        // Constraint failed
        if (error.errcode === 1555) {
            res.status(409).send({ message: "이미 존재하는 아이디입니다." })
            return
        }

        res.status(500).send({ error })
    }
})
app.get("/signout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).send({
                error: err,
                message: "세션을 삭제하는 도중 오류가 발생했습니다.",
            })
            return
        }

        res.clearCookie("username")
        res.redirect("/")
    })
})

app.post("/create-post", (req, res) => {
    if (!req.session.username) {
        res.status(401).send({ message: "로그인이 필요합니다." })
        return
    }

    const { title, content } = req.body
    if (!title || !content) {
        res.status(400).send({ message: "제목과 내용을 모두 입력해주세요." })
        return
    }

    const statement = `INSERT INTO post (title, content, author, created_at) VALUES ('${title}', '${content}', '${req.session.username}', datetime('now'))`

    try {
        db.prepare(statement).run()
        res.redirect("/")
    } catch (error) {
        res.status(500).send({ error })
    }
})
app.get("/view-post/:id", (req, res) => {
    const { id } = req.params
    const statement = `SELECT * FROM post WHERE id = ${id}`

    try {
        const result = db.prepare(statement).all()
        const post = result[0]
        res.render("view-post", { post })
    } catch (error) {
        res.status(500).send({ error })
    }
})

app.listen(8080, () => console.log("서버 시작됨: http://localhost:8080"))
process.on("exit", () => db.close())

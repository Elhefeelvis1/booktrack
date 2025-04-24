import express from 'express';
import ejs from 'ejs';
import axios from 'axios';
import pg from 'pg'

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended:true }));
app.use(express.static('public'));

//Database connection
const db = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: '',
    password: '',
    port: ''
})
db.connect();

//Global functions
let currentUser = "";
let userId = 0;
let currentDate = new Date().getFullYear() + "-" 
  + (new Date().getMonth() + 1) + "-"
  + new Date().getDate();

async function showAllUsers(){
  const contents = await db.query('SELECT * FROM users');
  return contents.rows;
}

async function showBooks(user){
  const books = await db.query('SELECT * FROM books WHERE users_id = $1', 
    [user]
  );
  return books.rows;
}

app.get("/", async (req, res) => {
  const users = await showAllUsers();
  const books = await showBooks(userId);
  res.render("index.ejs", {
    user: users,
    book: books
  })
})

app.post("/setUser", async (req, res) => {
  let id = req.body.id;
  userId = id;
  res.redirect('/');
})

app.post("/newUser", (req, res) => {
  res.render("new.ejs");
})

app.post("/rate", async(req, res) => {
  let rate = req.body.rateValue;
  let id = req.body.ratingId;

  try{
    await db.query("UPDATE books SET rating = $1 WHERE id = $2", [
      rate, id
    ]);
    res.redirect('/');
  }catch(error){
    console.error("Error fetching book data:", error);
    res.status(500).send("Error searching for books");
  }
})

app.post("/delete", async (req, res) => {
  let id = req.body.deleteId;
  
  try{
    await db.query("DELETE FROM books WHERE id = $1", [
      id
    ]);

    res.redirect("/");
  }catch(error){
    console.error("Error deleting book data:", error);
    res.status(500).send("Error deleting from books");
  }
})

app.post("/new", async (req, res) => {
  let name = req.body.name;
  let color = req.body.color;
  const id = await db.query(
    "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id",
    [name, color]
  );

  userId = id;
  res.redirect("/");
});

// Route to display book search results
app.post("/newBook", async (req, res) => {
  const users = await showAllUsers();
  const books = await showBooks(userId);
  let dataArr = [];
  let name = req.body.bookName;
  try {
    const returned = await axios.get(`https://openlibrary.org/search.json?title=${name}`);
    const data = returned.data.docs;
    if (name) {
      data.forEach((obj) => {
        dataArr.push(obj);
      });
      res.render("index.ejs", {
        user: users,
        book: books,
        bookList: dataArr,
      });
    }
  } catch (error) {
    console.error("Error fetching book data:", error);
    res.status(500).send("Error searching for books");
  }
});

//Route to save the book data to the database
app.post("/saveBook", async (req, res) => {
  let book = req.body.bookName;
  let author = req.body.author;
  let published_date = req.body.published_date;

  try {
    await db.query(
      'INSERT INTO books (name, rating, author, published_date, date_read, users_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [book, 0, author, published_date, currentDate, userId]
    );
    res.redirect('/');
  } catch (error) {
    console.error("Error saving book:", error);
    res.status(500).send("Error saving book to database");
  }
});

app.listen(port, () => {
  console.log(`App running on port ${port}`)
})
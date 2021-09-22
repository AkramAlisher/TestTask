import express from 'express';
import sqlite3 from 'sqlite3';

const PORT = 5000;

const app = express()

app.use(express.json())

app.listen(PORT, () => console.log('Server is working on port ' + PORT));

let db = new sqlite3.Database('../db.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the chinook database.');
});
app.post('appointments/', (req, res) => {
    console.log(req.body);
    res.status(200);
})

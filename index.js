const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();
require('dotenv').config();
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wtx9jbs.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const Dbconnect = async () => {
    try {
        await client.connect()
        console.log('Fedocuis Database Connceted Successfully');
    }
    catch (error) {
        console.log(error.name, error.message);
    }
}
Dbconnect();


// collections
const allMeals = client.db('FodeciousDb').collection('Allmeals');


app.get('/', async (req, res) => {
    res.send('Fodecious server is running');
})

app.get('/meals', async (req, res) => {
    try {
        const result = await allMeals.find().toArray();
        res.send(result)


    } catch (error) {
        console.log(error.message);
    }
})



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
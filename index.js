const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();
require('dotenv').config();
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
const allMealsCollection = client.db('FodeciousDb').collection('Allmeals');
const allReviewsCollection = client.db('FodeciousDb').collection('Allreviews')
const allUserCollection = client.db('FodeciousDb').collection('Allusers')

app.get('/', async (req, res) => {
    res.send('Fodecious server is running');
})

app.get('/allreviews', async (req, res) => {
    const title = req.query.title;
    let review_filter = {}
    if (title) {
        review_filter = { title: title }
    }
    try {
        const result = await allReviewsCollection.find(review_filter).toArray();
        res.send(result)
    } catch (error) {
        console.log(error);
    }


})
app.get('/user', async (res, req) => {
    const result = await allUserCollection.find().toArray();
    res.send(result)
})
app.get('/meals', async (req, res) => {
    const { limit, offset, id, min } = req.query;
    console.log(min, "on server");
    let query = {}
    if (id) {
        query._id = new ObjectId(id)
    }
    console.log(limit, offset);
    const meals = await allMealsCollection.find(query).skip(Number(offset)).limit(Number(limit)).toArray();
    res.send(meals);
});


// app.get('/meals', async (req, res) => {
//     const id = req.query.id;
//     console.log(id, "id on server");
//     let query = {}
//     if (id) {
//         query._id = new ObjectId(id)
//     }
//     try {
//         const result = await allMealsCollection.find(query).toArray();
//         res.send(result)
//     } catch (error) {
//         console.log(error.message);
//     }
// })

app.post('/jwt', async (req, res) => {
    console.log(req.body);
})
app.post('/user', async (req, res) => {
    const user = req.body;
    const filter = { email: user.email };
    const ExistUser = await allUserCollection.findOne(filter);
    if (ExistUser) {
        res.send({ message: `same email contains another user` })
    }
    const result = await allUserCollection.insertOne(user);
    res.send(result)


})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
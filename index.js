const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();
const jwt = require('jsonwebtoken')
require('dotenv').config();
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { JsonWebTokenError } = require('jsonwebtoken');
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
const allRequestCollection = client.db('FodeciousDb').collection('Allrequest')
const allUpcoming = client.db('FodeciousDb').collection('UpcomingMeals')
app.get('/', async (req, res) => {
    res.send('Fodecious server is running');
})
app.get('/upcoming', async (req, res) => {
    const result = await allUpcoming.find().toArray();
    res.send(result)
})
app.get('/allreviews', async (req, res) => {
    const { title, email } = req.query;
    console.log(title, email);
    let review_filter = {}
    if (title) {
        review_filter = { title: title }
    }
    if (email) {
        review_filter = { email: email }
    }
    try {
        const result = await allReviewsCollection.find(review_filter).toArray();
        res.send(result)
    } catch (error) {
        console.log(error);
    }

})
app.get('/user', async (req, res) => {
    const email = req.query.email;
    const query = {}
    console.log(email, "ema");
    if (email) {
        query.email = email
    }
    const result = await allUserCollection.find(query).toArray();
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
    try {
        const meals = await allMealsCollection.find(query).skip(Number(offset)).limit(Number(limit)).toArray();
        res.send(meals);
    } catch (error) {
        console.log(error.message);
    }
});

app.get('/allRequest', async (req, res) => {
    const { email } = req.query;
    let query = {}
    if (email) {
        query = { email: email }
    }
    const result = await allRequestCollection.find(query).toArray();
    res.send(result)
})
app.post('/upcoming', async (req, res) => {
    const meal = req.body;
    const result = await allUpcoming.insertOne(meal);
    res.send(result);
})
app.post('/allreviews', async (req, res) => {
    const review = req.body;
    const result = await allReviewsCollection.insertOne(review);
    res.send(result);
})
app.post('/jwt', async (req, res) => {
    const user_email = req.body;
    const token = jwt.sign(user_email, process.env.TOKEN_KEY, { expiresIn: '2hr' })
    res.send({ token: token })
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

app.post('/allRequest', async (req, res) => {
    const review = req.body;
    console.log(review);
    const { title } = req.query;
    console.log(title, "on");
    const exist = await allRequestCollection.findOne({ title: title });
    console.log(exist);

    if (exist) {
        const update = {
            $set: {
                count: review.count,
                rcount: review.rcount,
            }
        }
        const result = await allRequestCollection.updateOne({ title: title }, update)
        res.send(result)
    }
    else {
        const result = await allRequestCollection.insertOne(review);
        res.send(result);
    }

})

// app.patch('/allreviews', async (req, res) => {
//     const review = req.body;
//     console.log(review, "backend");
//     const { title } = req.query;
//     const filter = { title: title };
//     const option = { upsert: true }
//     const update = {
//         $push: {
//             userReviews: review
//         }
//     }
//     const result = await allReviewsCollection.updateOne(filter, update, option)
//     res.send(result)
// })

app.patch('/meals', async (req, res) => {
    const id = req.query.id;
    const filter = { _id: new ObjectId(id) }
    const option = { upsert: true }

    const update = {
        $inc: {
            count: 1
        }
    }
    const result = await allMealsCollection.updateOne(filter, update, option)
    res.send(result)
})


app.delete('/allRequest', async (req, res) => {
    const { id } = req.query;
    const filter = { _id: new ObjectId(id) }
    const result = await allRequestCollection.deleteOne(filter)
    res.send(result)
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
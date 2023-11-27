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

const verifyToken = (req, res, next) => {
    console.log("verify token");
    console.log('inside verify token', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized not logged access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    console.log(token);
    jwt.verify(token, process.env.TOKEN_KEY, (er, decoded) => {
        if (er) {
            return res.status(401).send({ message: 'unauthorized not logged in access' })

        }
        req.decode = decoded;
        next();
    })
}
const verifyAdmin = async (req, res, next) => {
    const email = req.decode.email;
    const query = { email: email };
    const result = await allUserCollection.findOne(query);
    const isAdmin = result.role == 'admin';
    if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access not for you bro' });
    }
    next();
}
// admin Checking
app.get('/user/admin', verifyToken, async (req, res) => {
    const userEmail = req.query.email;
    console.log(userEmail, "going for checking");
    const decoded_email = req.decode.email;
    try {
        if (userEmail != decoded_email) {
            return res.status(401).send({ message: 'unauthorized not logged in access' })
        }
        const user = await allUserCollection.findOne({ email: decoded_email });
        let isAdmin = false;
        if (user) {
            isAdmin = user.role == 'admin';
            res.send({ isAdmin })
        }
    } catch (error) {
        console.log(error);
    }


})

app.get('/', async (req, res) => {
    res.send('Fodecious server is running');
})
app.get('/upcoming', async (req, res) => {
    const result = await allUpcoming.find().toArray();
    res.send(result)
})
app.get('/allreviews', async (req, res) => {
    const { title, email, id } = req.query;
    console.log(title, email);
    let review_filter = {}
    if (title) {
        review_filter = { title: title }
    }
    if (email) {
        review_filter = { email: email }
    }
    if (id) {
        review_filter = { _id: new ObjectId(id) }
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
    const { limit, offset, id, min, title } = req.query;
    console.log(min, "on server");
    let query = {}
    if (id) {
        query._id = new ObjectId(id)
    }
    if (title) {
        query.title = title
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




app.post('/meals', verifyToken, verifyAdmin, async (req, res) => {
    const meal = req.body;
    const result = await allMealsCollection.insertOne(meal);
    res.send(result);
})
app.post('/upcoming', verifyToken, verifyAdmin, async (req, res) => {
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
    const request_meal = req.body;
    console.log(request_meal);
    const { title } = req.query;
    console.log(title, "on");
    const exist = await allRequestCollection.findOne({ title: title, email: request_meal.email });
    console.log(exist);
    if (exist) {
        const update = {
            $set: {
                count: request_meal.count,
                rcount: request_meal.rcount,
            },
            $inc: { request_count: 1 }
        }
        console.log("before update", request_meal);
        const result = await allRequestCollection.updateOne({ title: title, email: request_meal.email }, update)
        console.log("after update", result);
        res.send(result)
    }
    else {
        const result = await allRequestCollection.insertOne(request_meal);
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

app.patch('/user/admin', verifyToken, verifyAdmin, async (req, res) => {
    const { email, username } = req.query;
    console.log(email, username, "admin handle this");
    const query = { email: email, name: username }
    console.log(query);
    const update = {
        $set: {
            role: 'admin'
        }
    }
    const result = await allUserCollection.updateOne(query, update);
    res.send(result)
}
)
app.patch('/user/admin/meals', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.query;
    const meal = req.body;
    const query = { _id: new ObjectId(id) };
    const update = {
        $set: {

        }
    }
})

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
app.patch('/allreviews', async (req, res) => {
    const { id } = req.query;
    const query = { _id: new ObjectId(id) }
    const NewReview = req.body;
    console.log(NewReview, id, "update review");
    const update = {
        $set: {
            comment: NewReview.comment,
            rating: NewReview.rating
        }
    }
    const result = await allReviewsCollection.updateOne(query, update)
    console.log(result);
    res.send(result)
})



app.delete('/user/admin', async (req, res) => {
    const { email, username } = req.query;
    console.log(email, username, "admin handle this");
    const query = { email: email, name: username }
    console.log(query);
    const result = await allUserCollection.deleteOne(query)
    res.send(result);
})
app.delete('/allRequest', async (req, res) => {
    const { id } = req.query;
    const filter = { _id: new ObjectId(id) }
    const result = await allRequestCollection.deleteOne(filter)
    res.send(result)
})
app.delete('/allreviews', async (req, res) => {
    const { id } = req.query;
    const filter = { _id: new ObjectId(id) }
    const result = await allReviewsCollection.deleteOne(filter)
    res.send(result)
})

app.delete('/meals', async (req, res) => {
    const { id } = req.query;
    const query = { _id: new ObjectId(id) }
    const result = await allMealsCollection.deleteOne(query);
    res.send(result);
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
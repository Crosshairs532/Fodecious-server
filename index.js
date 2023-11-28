const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();
const jwt = require('jsonwebtoken')
const stripe = require('stripe')('sk_test_51OEBSyGrZhzy0KhFr6kXPT5gd6qtU3Q1va20BAzF6vlQ8V0g8eYP6JrniDHHmMp4EYZ2VPz0MgBOJHWZoYxAvul100JUpjUG0t')
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
const LikedMealsCollection = client.db('FodeciousDb').collection('LikedMeals');
const paymentCollections = client.db('FodeciousDb').collection('payments');

const verifyToken = (req, res, next) => {
    // console.log("verify token");
    // console.log('inside verify token', req.headers.authorization);
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

app.post("/create-payment-intent", async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    const payementIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'USD',
        payment_method_types: [
            'card'
        ]
    })
    res.send({
        clientSecret: payementIntent.client_secret
    })
})
app.post('/payments', async (req, res) => {
    const payment = req.body;
    const result = await paymentCollections.insertOne(payment)
    res.send(result)

})





app.get('/', async (req, res) => {
    res.send('Fodecious server is running');
})
// admin Checking
app.get('/user/admin', verifyToken, async (req, res) => {
    const userEmail = req.query.email;
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
app.get('/user/admin/allreviews', verifyToken, verifyAdmin, async (req, res) => {
    const all_reviews = await allReviewsCollection.find().toArray();
    res.send(all_reviews)
})

app.get('/upcoming', async (req, res) => {
    const result = await allUpcoming.find().toArray();
    res.send(result)
})
app.get('/allreviews', async (req, res) => {
    console.log('httes');
    const { title, email, id } = req.query;
    // console.log(title, email);
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
        console.log(result, " from useresfafafa");
        res.send(result)
    } catch (error) {
        console.log(error);
    }

})
app.get('/admin/allrequest', verifyToken, verifyAdmin, async (req, res) => {
    const { name, email } = req.query
    console.log(name, email);
    let filter = {}
    if (name && email) {
        filter = {
            $and: [
                {
                    username: { $regex: name, $options: 'i' }
                },
                {
                    email: { $regex: email, $options: 'i' }
                }
            ]
        }
    }
    const result = await allRequestCollection.find(filter).toArray();
    res.send(result)
})

app.get('/user', async (req, res) => {
    const email = req.query.email;
    const query = {}
    // console.log(email, "ema");
    if (email) {
        query.email = email
    }
    const result = await allUserCollection.find(query).toArray();
    res.send(result)
})
app.get('/admin/meals', verifyToken, verifyAdmin, async (req, res) => {
    const { email } = req.query;
    let query = {}
    if (email) {
        query = { email: email }
    }
    const result = await allMealsCollection.find(query).toArray();
    res.send(result)
})

app.get('/meals', async (req, res) => {
    const { limit, offset, id, min, title } = req.query;
    let query = {}
    if (id) {
        query._id = new ObjectId(id)
    }
    if (title) {
        query.title = title
    }

    try {
        const meals = await allMealsCollection.find(query).skip(Number(offset)).limit(Number(limit)).toArray();
        // console.log(meals, "meals in server");
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

app.get('/upcomingLikedMeals', async (req, res) => {
    const { email, title } = req.query;
    let query = {}
    if (email && title) {
        query = { email: email, meal_title: title }
    }
    console.log(query);
    const AlreadyLiked = await LikedMealsCollection.findOne(query);
    console.log(AlreadyLiked);
    if (AlreadyLiked) {
        res.send(AlreadyLiked)
    }
    else {
        res.send(false)
    }

})

app.get('/likedMeals', async (req, res) => {
    const { email } = req.query;
    let query = {}
    if (email) {
        query = { email: email }
    }
    // console.log(query, "likelike");
    const result = await LikedMealsCollection.find(query).toArray();
    res.send(result);
})
app.get('/upcoming', async (req, res) => {
    const result = await allUpcoming.find().toArray();
    res.send(result);
})
app.get('/admin/upcoming', async (req, res) => {
    const result = await allUpcoming.find().sort({ count: -1 }).toArray();
    res.send(result);
})


app.post('/admin/upcoming', verifyToken, verifyAdmin, async (req, res) => {
    const result = await allMealsCollection.insertOne(req.body);
    res.send(result)
})
app.post('/likedMeals', async (req, res) => {
    const Meal = req.body;
    const update = {
        $inc: {
            count: 1
        }
    }

    const result = await LikedMealsCollection.insertOne({ ...Meal, likeInfo: true })
    const update_upcoming_count = await allUpcoming.updateOne({ title: Meal.meal_title }, update)
    res.send(result);
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
    const isExist = await allMealsCollection.findOne({ title: review.title });
    if (isExist) {
        const update = {
            $inc: {
                rcount: 1
            }
        }
        const result = await allMealsCollection.updateOne({ title: review.title }, update)
    }
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
    console.log(request_meal, "are vai");
    const { title } = req.query;
    console.log(title, "on");
    const exist = await allRequestCollection.findOne({ title: title, email: request_meal.email });
    if (exist) {
        const update = {
            $inc: { request_count: 1 },
            $set: {
                count: request_meal.count,
                rcount: request_meal.rcount
            }
        }
        // console.log("before update", request_meal);
        const result = await allRequestCollection.updateOne({ title: title, email: request_meal.email }, update)
        console.log("after update", result.data);
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

app.patch('/admin/Status', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.query;
    const query = { _id: new ObjectId(id) }
    const update = {
        $set: {
            status: 'delivered'
        }
    }
    const result = await allRequestCollection.updateOne(query, update)
    res.send(result);
})

app.patch('/user/admin', verifyToken, verifyAdmin, async (req, res) => {
    const { email, username } = req.query;
    // console.log(email, username, "admin handle this");
    const query = { email: email, name: username }
    // console.log(query);
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
// all meals , here count is number of likes .
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
    // console.log(NewReview, id, "update review");
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
app.patch('/admin/badge_update', async (req, res) => {
    const { badge, email } = req.body;
    const filter = { email: email };
    const update = {
        $set: {
            badge: badge
        },
        $push: {
            all_badge: badge
        }
    };
    const result = await allUserCollection.updateOne(filter, update);
    res.send(result)
})


app.delete('/user/admin', async (req, res) => {
    const { email, username } = req.query;
    // console.log(email, username, "admin handle this");
    const query = { email: email, name: username }
    // console.log(query);
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
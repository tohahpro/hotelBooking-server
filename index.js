const express = require('express')
require('dotenv').config()
const cors = require("cors")
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')


const app = express()
const port = process.env.PORT || 4100


app.use(express.json());
app.use(cors({
    origin: [

        'https://hotelroombooking10.netlify.app'
    ],
    credentials: true
}))
app.use(cookieParser())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jytf0dy.mongodb.net/?retryWrites=true&w=majority`;




// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// middlewares 
const logger = async (req, res, next) => {
    console.log('called', req.host, req.url);
    next();
}


const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'Not authorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        //  error
        if (err) {
            return res.status(401).send({ message: 'Unauthorized' })
        }
        // If token is valid then it would be decoded
        req.user = decoded;
        next();
    })

}


async function run() {
    try {
        const roomCollection = client.db('hotelDB').collection('allRoom')
        const bookingCollection = client.db('hotelDB').collection('booking')
        const reviewCollection = client.db('hotelDB').collection('review')



        // Auth Related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })


        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log(user);
            res.clearCookie('token', {
                maxAge: 0,
                sameSite: "none",
                secure: true
            }).send({ success: true });
        })

        app.get('/rooms', async (req, res) => {
            const cursor = roomCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })


        app.post('/review', async (req, res) => {
            const addReview = req.body;
            const result = await reviewCollection.insertOne(addReview)
            res.send(result)

        })



        // user api 

        app.get('/bookings', logger, verifyToken, async (req, res) => {
            if (req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'Forbidden access!' })
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result)

        })


        app.put('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedDate = req.body
            const date = {
                $set: {
                    date: updatedDate.date
                }
            }
            const result = await bookingCollection.updateOne(filter, date, options);
            res.send(result)
        })


        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })


    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
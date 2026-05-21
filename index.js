const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cors());
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');


const uri = process.env.MONGO_URI;
const port = process.env.PORT || 3000;


const JWKS = createRemoteJWKSet(
    new URL(`${process.env.URL}/api/auth/jwks`)
)

const VerifyToken = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }
    const MainToken = token.split(' ')[1];
    if (!MainToken) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }
    try {
        const { payload } = await jwtVerify(MainToken, JWKS)
        console.log(payload);
        req.user = payload;
        next();

    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }



}



const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        const database = client.db("sportshub");
        const sportsFacilities = database.collection("sports_facilities");
        const bookings = database.collection("bookings");
        // Connect the client to the server	(optional starting in v4.7)

        app.get('/', async (req, res) => {
            const data = await sportsFacilities.find({}).toArray();
            res.send(data);
        })
        app.get('/facilities/:id', VerifyToken, async (req, res) => {
            const data = await sportsFacilities.findOne({ _id: new ObjectId(req.params.id) });
            res.send(data);
        });
        app.post('/facility', VerifyToken, async (req, res) => {
            const data = req.body;
            const result = await bookings.insertOne(data);
            res.send(result);
        });

        app.post('/addfacilities', VerifyToken, async (req, res) => {
            try {
                const data = req.body;
                const result = await sportsFacilities.insertOne({
                    ...data,
                    createdAt: new Date(),
                    user_id: req.user.id
                });

                res.json(result);

            } catch (error) {
                res.status(500).json({
                    message: error.message
                });
            }
        });

        app.get('/mybookings/:user_id', async (req, res) => {
            const id = req.params.user_id;
            const data = await bookings.find({ user_id: id }).toArray();
            res.send(data);
        });

        app.delete('/mybookings/:id', VerifyToken, async (req, res) => {
            const facilityId = req.params.id;
            const userId = req.user.id;

            const result = await bookings.deleteMany({
                user_id: userId,
                facility_id: facilityId
            });

            res.send(result);
        })

        app.patch('/mybookings/:id', VerifyToken, async (req, res) => {
            const facilityId = req.params.id;
            const userId = req.user.id;
            const updatedData = req.body;
            const result = await bookings.updateOne(
                {
                    user_id: userId,
                    facility_id: facilityId
                },
                {
                    $set: updatedData
                }
            );
            res.send(result);
        });


        app.get('/managemyfacilities/:user_email', async (req, res) => {
            const email = req.params.user_email;
            const data = await sportsFacilities.find({ user_email: email }).toArray();
            res.send(data);
        });


        app.patch('/managemyfacilities/:id', VerifyToken, async (req, res) => {
            const facilityId = req.params.id;
            const result = await sportsFacilities.updateOne(
                {
                    _id: new ObjectId(facilityId),
                    user_id: req.user.id
                },
                {
                    $set: req.body
                }
            );
            res.send(result);
        });


        app.delete('/managemyfacilities/:id', VerifyToken, async (req, res) => {
            try {
                const facilityId = req.params.id;
                const result = await sportsFacilities.deleteOne({
                    _id: new ObjectId(facilityId),
                    user_id: req.user.id
                });
                if (result.deletedCount === 0) {
                    return res.status(404).send({
                        message: 'Facility not found or unauthorized'
                    });
                }
                res.send({
                    success: true,
                    message: 'Facility deleted successfully',
                    result
                });

            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: error.message
                });
            }
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
run().catch(console.dir);
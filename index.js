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
    new URL('http://localhost:3000/api/auth/jwks')
)

const VerifyToken = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }
    const MainToken = token.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }
    try {
        const { payload } = await jwtVerify(MainToken, JWKS)
        console.log(payload);
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
        const database = client.db("sportshub");
        const sportsFacilities = database.collection("sports_facilities");
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        app.get('/', async (req, res) => {
            const data = await sportsFacilities.find({}).toArray();
            res.send(data);
        })
        app.get('/facility/:id', VerifyToken, async (req, res) => {
            const token = req.headers.authorization;

            const data = await sportsFacilities.findOne({ _id: new ObjectId(req.params.id) });
            res.send(data);
        });
        app.post('/addfacilities', VerifyToken, async (req, res) => {   
            const data = req.body;
            const result = await sportsFacilities.insertOne(data);
            res.send(result);
            console.log(result, data);

        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
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
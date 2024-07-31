require('dotenv').config();
const { Database } = require('st.db');
const { MongoDriver } = require('@st.db/mongodb');
const db = new Database({ driver: new MongoDriver(process.env.DATABASE_URL, "k9crypt", "messages") });

module.exports = db;

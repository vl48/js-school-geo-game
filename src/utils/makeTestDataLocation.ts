import path from "path";
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
import * as mongo from "mongodb";
import { bryptAsync } from "./bcrypt-async-helper";
const MongoClient = mongo.MongoClient;
import { positionCreator } from "./geoUtils";
import {
  USER_COLLECTION_NAME,
  POSITION_COLLECTION_NAME,
  POST_COLLECTION_NAME,
  GAMEAREA_COLLECTION_NAME,
} from "../config/collectionNames";

const uri = process.env.CONNECTION || "";

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async function makeTestData() {
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    await usersCollection.deleteMany({});
    await usersCollection.createIndex({ userName: 1 }, { unique: true });
    const secretHashed = await bryptAsync("secret");
    const team1 = {
      name: "Team1-inside",
      userName: "t1",
      password: secretHashed,
      role: "team",
    };
    const team2 = {
      name: "Team2.inside",
      userName: "t2",
      password: secretHashed,
      role: "team",
    };
    const team3 = {
      name: "Team3-outside",
      userName: "t3",
      password: secretHashed,
      role: "team",
    };
    const team4 = {
      name: "Team4-outside",
      userName: "t4",
      password: secretHashed,
      role: "team",
    };

    const status = await usersCollection.insertMany([
      team1,
      team2,
      team3,
      team4,
    ]);

    const positionsCollection = db.collection(POSITION_COLLECTION_NAME);
    await positionsCollection.deleteMany({});
    await positionsCollection.createIndex(
      { lastUpdated: 1 },
      { expireAfterSeconds: 30 }
    );
    await positionsCollection.createIndex({ location: "2dsphere" });
    const positions = [
      positionCreator(
        12.567672729492188,
        55.78670903555303,
        team1.userName,
        team1.name,
        true
      ),
      positionCreator(
        12.561578750610352,
        55.779758908094266,
        team2.userName,
        team2.name,
        true
      ),
      positionCreator(
        12.551965713500977,
        55.788349856956444,
        team3.userName,
        team3.name,
        true
      ),
      positionCreator(
        12.568788528442383,
        55.77396618813479,
        team4.userName,
        team4.name,
        true
      ),
    ];
    const locations = await positionsCollection.insertMany(positions);
    const postCollection = db.collection(POST_COLLECTION_NAME);
    await postCollection.deleteMany({});
    const posts = await postCollection.insertMany([
      {
        _id: "Post1",
        task: { text: "1+1", isUrl: false },
        taskSolution: "2",
        location: {
          type: "Point",
          coordinates: [12.49, 55.77],
        },
      },
      {
        _id: "Post2",
        task: { text: "4-4", isUrl: false },
        taskSolution: "0",
        location: {
          type: "Point",
          coordinates: [12.4955, 55.774],
        },
      },
    ]);

    const gameareaCollection = db.collection(GAMEAREA_COLLECTION_NAME);
    await gameareaCollection.deleteMany({});
    await gameareaCollection.createIndex({ location: "2dsphere" });
    const gameArea = await gameareaCollection.insertOne({
      _id: "mainArea",
      location: {
        type: "Polygon",
        coordinates: [
          [
            [12.544240951538086, 55.77594546428934],
            [12.549219131469727, 55.77502825125135],
            [12.568359375, 55.77604201177451],
            [12.578487396240234, 55.7767661102896],
            [12.573423385620117, 55.79467119920912],
            [12.57059097290039, 55.795877445664104],
            [12.544240951538086, 55.77594546428934],
          ],
        ],
      },
    });

    console.log(`Inserted ${posts.insertedCount} test Posts`);
    console.log(`Inserted ${gameArea.insertedCount} test gameAreas`);
    console.log(`Inserted ${status.insertedCount} test users`);
    console.log(`Inserted ${locations.insertedCount} test Locations`);
    console.log(`NEVER, NEVER, NEVER run this on a production database`);
  } catch (err) {
    console.error(err);
  } finally {
    client.close();
  }
})();

const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
import IPoint from "../interfaces/Point";
import * as mongo from "mongodb";
import { ApiError } from "../errors/apiError";
import UserFacade from "./userFacadeWithDB";
import IPosition from "../interfaces/Position";
import IPost from "../interfaces/Post";
import {
  positionCreator,
  getLatitudeInside,
  getLatitudeOutside,
} from "../utils/geoUtils";
import {
  POSITION_COLLECTION_NAME,
  POST_COLLECTION_NAME,
  GAMEAREA_COLLECTION_NAME,
} from "../config/collectionNames";
import { ExceptionHandler } from "winston";

let positionCollection: mongo.Collection;
let postCollection: mongo.Collection;
let gameAreaCollection: mongo.Collection;
const EXPIRES_AFTER = 30;

export default class GameFacade {
  static readonly DIST_TO_CENTER = 15;

  static async setDatabase(client: mongo.MongoClient) {
    const dbName = process.env.DB_NAME;
    if (!dbName) {
      throw new Error("Database name not provided");
    }
    //This facade uses the UserFacade, so set it up with the right client
    await UserFacade.setDatabase(client);

    try {
      if (!client.isConnected()) {
        await client.connect();
      }
      positionCollection = client
        .db(dbName)
        .collection(POSITION_COLLECTION_NAME);

      postCollection = client.db(dbName).collection(POST_COLLECTION_NAME);
      await postCollection.createIndex({ location: "2dsphere" });
      //TODO
      //1) Create expiresAfterSeconds index on lastUpdated
      //2) Create 2dsphere index on location

      gameAreaCollection = client
        .db(dbName)
        .collection(GAMEAREA_COLLECTION_NAME);

      //TODO uncomment if you plan to do this part of the exercise
      //postCollection = client.db(dbName).collection(POST_COLLECTION_NAME);
      //TODO If you do this part, create 2dsphere index on location
      //await postCollection.createIndex({ location: "2dsphere" })
      return client.db(dbName);
    } catch (err) {
      console.error("Could not connect", err);
    }
  }

  /*
  Create a new polygon meant to be used on clients by React Native's MapView which
  requres an object as the one we create below 
  NOTE --> how we swap longitude, latitude values
  */
  static async gameArea() {
    try {
      let data = await gameAreaCollection.findOne({ _id: "mainArea" });
      let polygonForClient = {
        coordinates: data.location.coordinates[0].map((point: any) => {
          return { latitude: point[1], longitude: point[0] };
        }),
      };
      return polygonForClient;
    } catch (err) {
      throw new ApiError("Couldnt get gamearea", 500);
    }
  }

  static async isUserInArea(longitude: number, latitude: number) {
    try {
      const point = { type: "Point", coordinates: [longitude, latitude] };
      let gamearea = await gameAreaCollection.findOne({
        location: {
          $geoIntersects: {
            $geometry: point,
          },
        },
      });

      let isInside = gamearea == null ? false : true;
      let msg = isInside
        ? "Point was inside the tested polygon"
        : "Point was NOT inside tested polygon";
      return {
        status: isInside,
        msg: msg,
      };
    } catch (err) {
      throw new ApiError("Couldnt determine if inside gamearea", 500);
    }
  }

  static async nearbyPlayers(
    userName: string,
    password: string,
    longitude: number,
    latitude: number,
    distance: number
  ) {
    let user;
    try {
      //Step-1. Find the user, and if found continue
      // Use relevant methods in the user facad>
      if (!(await UserFacade.checkUser(userName, password))) throw new Error();
    } catch (err) {
      throw new ApiError("wrong username or password", 403);
    }

    try {
      //If loggedin update (or create if this is the first login) his position
      //const point = { type: "Point", coordinates: [longitude, latitude] };
      //const date = new Date();
      const position = positionCreator(
        longitude,
        latitude,
        userName,
        userName,
        false
      );
      //Todo
      /*It's important you know what to do her. Remember a document for this user does
        not neccesarily exist. If not, you must create it, in not found (see what you can do wit upsert)
        Also remember to set a new timeStamp (use the date create above), since this document should only live for a
        short time */
      const found = await positionCollection.findOneAndUpdate(
        { userName: userName }, //Add what we are searching for (the userName in a Position Document)
        { $set: position },
        { upsert: true, returnOriginal: false } // Add what needs to be added here, remember the document might NOT exist yet
        //{ upsert: , returnOriginal:  }  // Figure out why you probably need to set both of these
      );

      /* TODO 
         By know we have updated (or created) the callers position-document
         Next step is to see if we can find any nearby players, friends or whatever you call them
         */
      const nearbyPlayers = await GameFacade.findNearbyPlayers(
        userName,
        position.location,
        distance
      );

      //If anyone found,  format acording to requirements
      const formatted = nearbyPlayers.map((player) => {
        return {
          userName: player.userName,
          lat: player.location.coordinates[1],
          lon: player.location.coordinates[0],
          // Complete this, using the requirements
        };
      });
      return formatted;
    } catch (err) {
      throw err;
    }
  }
  static async findNearbyPlayers(
    clientUserName: string,
    point: IPoint,
    distance: number
  ): Promise<Array<IPosition>> {
    try {
      const found = await positionCollection.find({
        userName: { $ne: clientUserName },
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [point.coordinates[0], point.coordinates[1]],
            },
            $maxDistance: distance,
          },
        },
      });
      return found.toArray();
    } catch (err) {
      throw err;
    }
  }

  static async getPostIfReached(
    postId: string,
    lat: number,
    lon: number
  ): Promise<any> {
    try {
      const post: IPost | null = await postCollection.findOne({
        _id: postId,
        location: {
          $near: { type: "Point", coordinates: [lon, lat] },
          $maxDistance: 10,
        },
      });
      if (post === null) {
        throw new ApiError("Post not reached", 400);
      }

      return {
        postId: post._id,
        task: post.task.text,
        isUrl: post.task.isUrl,
      };
    } catch (err) {
      throw err;
    }
  }

  //You can use this if you like, to add new post's via the facade
  static async addPost(
    name: string,
    taskTxt: string,
    isURL: boolean,
    taskSolution: string,
    lon: number,
    lat: number
  ): Promise<IPost> {
    const position = { type: "Point", coordinates: [lon, lat] };
    const status = await postCollection.insertOne({
      _id: name,
      task: { text: taskTxt, isURL },
      taskSolution,
      location: {
        type: "Point",
        coordinates: [lon, lat],
      },
    });
    const newPost: any = status.ops;
    return newPost as IPost;
  }
}

import express from "express";
const router = express.Router();
import authMiddleware from "../middlewares/basic-auth";
import setup from "../config/setupDB";
import userFacade from "../facades/userFacadeWithDB";
import graphqlHTTP from "express-graphql";
let { buildSchema } = require("graphql");
import GameUser from "../interfaces/GameUser";
import { ApiError } from "../errors/apiError";

const USE_AUTHENTICATION = false;

(async function setupDB() {
  const client = await setup();
  userFacade.setDatabase(client);
})();

if (USE_AUTHENTICATION) {
  router.use(authMiddleware);
}

const schema = buildSchema(`
  type User {
    name: String
    userName: String
    role: String
    password: String
  }
  input UserInput {
    name: String
    userName: String
    password: String
  }
  
  type Query {
    users : [User]!
  }
  type Mutation {
    createUser(input: UserInput): String
  }
`);

const root = {
  users: async () => {
    const users = await userFacade.getAllUsers();
    const usersDTO = users.map((user) => {
      const { name, userName, role } = user;
      return { name, userName, role };
    });
    return usersDTO;
  },
  createUser: async (inp: any) => {
    const { input } = inp;
    try {
      const newUser: GameUser = {
        name: input.name,
        userName: input.userName,
        password: input.password,
        role: "user",
      };
      const status = await userFacade.addUser(newUser);
      return status;
    } catch (err) {
      throw err;
    }
  },
};

//Only if we need roles
router.use("/", (req: any, res, next) => {
  if (USE_AUTHENTICATION) {
    const role = req.role;
    if (role != "admin") {
      throw new ApiError("Not Authorized", 403);
    }
    next();
  }
});

router.use(
  "/",
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  })
);

module.exports = router;

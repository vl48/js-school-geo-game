import express from "express";
const gju = require("geojson-utils");
const { gameArea, players } = require("../geoNoBackend/gamedata");
const router = express.Router();

router.get("/isuserinarea/:lon/:lat", (req, res) => {
  res.send(
    gju.pointInPolygon(
      { type: "Point", coordinates: [req.params.lon, req.params.lat] },
      gameArea
    )
  );
});

// Find Nearby Players / geometryWithinRadius
router.get("/findNearbyPlayers/:lon/:lat/:rad", (req, res) => {
  const radius = req.params.rad;
  const center = {
    type: "Point",
    coordinates: [req.params.lon, req.params.lat],
  };
  let nearby = players.filter((p: any) =>
    gju.geometryWithinRadius(p.geometry, center, radius)
  );

  res.send(nearby);
});

// Distance To User / pointDistance
router.get("/distanceToUser/:lon/:lat/:username", (req, res) => {
  let user = players.find(
    (p: any) => p.properties.name === req.params.username
  );

  if (user == null) res.send(`Player "${req.params.username}" not found.`);

  res.send(
    `Distance to ${req.params.username}: ` +
      gju.pointDistance(
        {
          type: "Point",
          coordinates: [req.params.lon, req.params.lat],
        },
        user.geometry
      )
  );
});

module.exports = router;

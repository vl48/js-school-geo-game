const gameArea = {
  type: "Polygon",
  coordinates: [
    [
      [12.544841766357422, 55.775510997646286],
      [12.547502517700195, 55.77469032521712],
      [12.579259872436523, 55.77705574592867],
      [12.571878433227539, 55.79544320124432],
      [12.569131851196287, 55.79544320124432],
      [12.544841766357422, 55.775510997646286]
    ]
  ]
};

const players = [
  {
    type: "Feature",
    properties: {
      name: "T1-Inside"
    },
    geometry: {
      type: "Point",
      coordinates: [12.57084846496582, 55.779372753550554]
    }
  },
  {
    type: "Feature",
    properties: {
      name: "T2-Inside"
    },
    geometry: {
      type: "Point",
      coordinates: [12.564840316772461, 55.787046857373944]
    }
  },
  {
    type: "Feature",
    properties: { name: "T3-Outside" },
    geometry: {
      type: "Point",
      coordinates: [12.552824020385742, 55.79539495156544]
    }
  },
  {
    type: "Feature",
    properties: { name: "T4-Outside" },
    geometry: {
      type: "Point",
      coordinates: [12.578744888305664, 55.788398115363265]
    }
  }
];

module.exports = { gameArea, players };

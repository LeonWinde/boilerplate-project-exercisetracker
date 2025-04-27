const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const exerciseSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const newUser = new User({ username });

  const user = await newUser.save();
  res.json({
    username: user.username,
    _id: user._id,
  });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).send("Description and duration are required");
  }

  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).send("User not found");
  }

  const exerciseDate = date ? new Date(date) : new Date();
  const newExercise = new Exercise({
    userid: user._id,
    description,
    duration,
    date: exerciseDate,
  });

  newExercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    description,
    duration: Number(duration),
    date: exerciseDate.toDateString(),
  });
});



app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users.map((user) => ({ username: user.username, _id: user._id })));
  } catch (err) {
    res.status(500).send("Error fetching users");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const {_id } = req.params;
  const { from, to, limit } = req.query;

  let logs = await Exercise.find({ userid: _id }).where(
    "date",
    from ? { $gte: new Date(from) } : undefined,
    to ? { $lte: new Date(to) } : undefined
  ).limit(limit ? parseInt(limit) : undefined).exec();
  
  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).send("User not found");
  }

  res.json({
    _id: user._id,
    username: user.username,
    count: logs.length,
    log: logs.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toDateString(),
    })),
  });
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

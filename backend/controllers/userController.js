const User = require("../models/User");


// GET ALL USERS
exports.getUsers = async (req, res) => {
  try {

    const users = await User.find().select("-password");

    res.status(200).json(users);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }
};


// ADD USER
exports.addUser = async (req, res) => {

  try {

    const { name, email, password, role } = req.body;

    const newUser = new User({
      name,
      email,
      password,
      role,
      status: "Active"
    });

    await newUser.save();

    res.status(201).json(newUser);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// ASSIGN ROLE (CEO approval)
exports.assignRole = async (req, res) => {

  try {

    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        role,
        status: "Active"
      },
      { new: true }
    );

    res.status(200).json(user);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// EDIT USER
exports.updateUser = async (req, res) => {

  try {

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedUser);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};


// CHANGE STATUS (Active / Inactive)
exports.updateUserStatus = async (req, res) => {

  try {

    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.status(200).json(user);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};
const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/* GET USERS */

router.get("/", async (req,res)=>{

try{

const users = await pool.query(
"SELECT id,name,email,role,status FROM users ORDER BY id"
);

res.json(users.rows);

}catch(err){

console.error(err);
res.status(500).json({message:"Server error"});

}

});

/* UPDATE USER */

router.put("/:id", async (req,res)=>{

const { role,status } = req.body;
const { id } = req.params;

try{

await pool.query(
"UPDATE users SET role=$1,status=$2 WHERE id=$3",
[role,status,id]
);

res.json({message:"User updated"});

}catch(err){

console.error(err);
res.status(500).json({message:"Server error"});

}

});

/* DELETE USER */

router.delete("/:id", async (req,res)=>{

const { id } = req.params;

try{

await pool.query(
"DELETE FROM users WHERE id=$1",
[id]
);

res.json({message:"User deleted"});

}catch(err){

console.error(err);
res.status(500).json({message:"Server error"});

}

});

module.exports = router;
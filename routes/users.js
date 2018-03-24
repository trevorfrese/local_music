const express = require('express');
const users = require('../apis/users');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    users.retrieveUser(userId);

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});


module.exports = router;

const express = require('express');
const router = express.Router();
const Tape = require('../models/Tape');
const mongoose = require('mongoose');

// GET all tapes
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  // Check for valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid tape ID format' });
  }

  try {
    const tape = await Tape.findById(id);
    if (!tape) {
      return res.status(404).json({ error: 'Tape not found' });
    }
    res.json(tape);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST a new tape
router.post('/', async (req, res) => {
  try {
    const { name, urls } = req.body;
    const newTape = new Tape({ name, urls });
    const saved = await newTape.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

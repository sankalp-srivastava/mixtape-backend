const express = require('express');
const router = express.Router();
const Tape = require('../models/Tape');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Helper to extract JSON from markdown
function extractJSON(text) {
  return text.replace(/```json|```/g, '').trim();
}

// Helper to get YouTube video with max views
async function getTopYouTubeVideo(songTitle, artist) {
  const query = `${songTitle} ${artist} official audio`;

  const res = await youtube.search.list({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: 5,
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
  });

  if (!res.data.items.length) return null;

  const videoIds = res.data.items.map((item) => item.id.videoId);

  const statsRes = await youtube.videos.list({
    part: 'statistics',
    id: videoIds.join(','),
  });

  let topVideo = null;
  let maxViews = -1;

  for (let i = 0; i < statsRes.data.items.length; i++) {
    const views = parseInt(statsRes.data.items[i].statistics.viewCount);
    if (views > maxViews) {
      maxViews = views;
      topVideo = `https://www.youtube.com/watch?v=${videoIds[i]}`;
    }
  }

  return topVideo;
}

// Mixtape generate route
router.post('/generate', async (req, res) => {
  const { prompt, name } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
    });

    const geminiPrompt = `
    Generate a list of 7 popular songs that match this mood:
    "${prompt}"

    Respond ONLY in pure JSON (no markdown) like this:

    {
      "songs": [
        { "title": "Song Title 1", "artist": "Artist 1" },
        { "title": "Song Title 2", "artist": "Artist 2" }
      ]
    }
    `;

    const result = await model.generateContent(geminiPrompt);
    const responseText = result.response.text();

    const cleanJson = extractJSON(responseText);
    const mixtapeData = JSON.parse(cleanJson);

    const urls = [];

    for (const song of mixtapeData.songs) {
      const link = await getTopYouTubeVideo(song.title, song.artist);
      if (link) {
        urls.push(link);
      }
    }

    const newTape = new Tape({
      name: name || 'For You',
      urls,
    });

    const saved = await newTape.save();

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate mixtape' });
  }
});
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

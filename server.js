require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { all, get, initDb, run } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function parseInterests(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    age: row.age,
    location: row.location,
    destination: row.destination,
    dates: row.dates,
    type: row.type || 'seeking',
    post: row.bio || `${row.name} is looking for a travel companion.`,
    bio: row.bio || '',
    interests: parseInterests(row.interests),
    joinedAt: row.joined_at,
    isRealUser: true
  };
}

function mapGroup(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    name: row.name,
    destination: row.destination,
    dates: row.dates,
    description: row.description || '',
    creatorId: String(row.creator_id),
    creatorName: row.creator_name,
    memberCount: row.member_count || 0,
    joined: Boolean(row.joined),
    createdAt: row.created_at
  };
}

function computeRecommendationReasons(currentUser, candidate) {
  const reasons = [];
  const currentInterests = parseInterests(currentUser.interests);
  const candidateInterests = parseInterests(candidate.interests);
  const sharedInterests = currentInterests.filter((item) =>
    candidateInterests.some((candidateItem) => String(candidateItem).toLowerCase() === String(item).toLowerCase())
  );

  if (currentUser.destination && candidate.destination && currentUser.destination.toLowerCase() === candidate.destination.toLowerCase()) {
    reasons.push(`Heading to ${candidate.destination}`);
  }

  if (currentUser.dates && candidate.dates && currentUser.dates.toLowerCase() === candidate.dates.toLowerCase()) {
    reasons.push(`Traveling around ${candidate.dates}`);
  }

  if (sharedInterests.length) {
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
  }

  if (currentUser.type && candidate.type && currentUser.type !== candidate.type) {
    reasons.push('Complementary travel style');
  }

  if (currentUser.location && candidate.location && currentUser.location.toLowerCase() === candidate.location.toLowerCase()) {
    reasons.push(`Both based in ${candidate.location}`);
  }

  return reasons.slice(0, 3);
}

function overlapCount(listA = [], listB = []) {
  const setB = new Set(listB.map((item) => String(item).toLowerCase()));
  return listA.filter((item) => setB.has(String(item).toLowerCase())).length;
}

function computeRecommendationScore(currentUser, candidate) {
  let score = 0;
  const currentInterests = parseInterests(currentUser.interests);
  const candidateInterests = parseInterests(candidate.interests);

  if (currentUser.destination && candidate.destination && currentUser.destination.toLowerCase() === candidate.destination.toLowerCase()) {
    score += 45;
  }

  if (currentUser.dates && candidate.dates && currentUser.dates.toLowerCase() === candidate.dates.toLowerCase()) {
    score += 25;
  }

  score += overlapCount(currentInterests, candidateInterests) * 12;

  if (currentUser.type && candidate.type && currentUser.type !== candidate.type) {
    score += 8;
  }

  if (currentUser.location && candidate.location && currentUser.location.toLowerCase() === candidate.location.toLowerCase()) {
    score += 6;
  }

  return score;
}

function makeStatusMap(rows, currentUserId) {
  const map = {};
  for (const row of rows) {
    const otherId = String(row.requester_id === currentUserId ? row.receiver_id : row.requester_id);
    if (row.status === 'accepted') {
      map[otherId] = 'connected';
    } else if (row.status === 'pending' && row.requester_id === currentUserId) {
      map[otherId] = 'pending_sent';
    } else if (row.status === 'pending' && row.receiver_id === currentUserId) {
      map[otherId] = 'pending_received';
    }
  }
  return map;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

async function areConnected(userA, userB) {
  const row = await get(
    `
      SELECT id
      FROM connections
      WHERE status = 'accepted'
        AND (
          (requester_id = ? AND receiver_id = ?)
          OR
          (requester_id = ? AND receiver_id = ?)
        )
      LIMIT 1
    `,
    [userA, userB, userB, userA]
  );

  return Boolean(row);
}

async function isGroupMember(groupId, userId) {
  const membership = await get(
    `
      SELECT id
      FROM group_members
      WHERE group_id = ? AND user_id = ?
      LIMIT 1
    `,
    [groupId, userId]
  );

  return Boolean(membership);
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      age,
      location,
      destination,
      dates,
      type,
      bio,
      interests
    } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existingUser) {
      res.status(409).json({ error: 'An account with that email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      `
        INSERT INTO users (name, email, password_hash, age, location, destination, dates, type, bio, interests)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        age || null,
        location || null,
        destination || null,
        dates || null,
        type || 'seeking',
        bio || `${name.trim()} is looking for a travel companion.`,
        JSON.stringify(Array.isArray(interests) ? interests : [])
      ]
    );

    const user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = signToken(user);
    res.status(201).json({ token, user: mapUser(user) });
  } catch (error) {
    console.error('Register error', error);
    res.status(500).json({ error: 'Could not create the account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken(user);
    res.json({ token, user: mapUser(user) });
  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({ error: 'Could not sign in.' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user: mapUser(user) });
  } catch (error) {
    res.status(500).json({ error: 'Could not load your profile.' });
  }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const current = await get('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    if (!current) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const next = {
      name: req.body.name?.trim() || current.name,
      age: req.body.age ?? current.age,
      location: req.body.location ?? current.location,
      destination: req.body.destination ?? current.destination,
      dates: req.body.dates ?? current.dates,
      type: req.body.type || current.type,
      bio: req.body.bio ?? current.bio,
      interests: Array.isArray(req.body.interests) ? req.body.interests : parseInterests(current.interests)
    };

    await run(
      `
        UPDATE users
        SET name = ?, age = ?, location = ?, destination = ?, dates = ?, type = ?, bio = ?, interests = ?
        WHERE id = ?
      `,
      [
        next.name,
        next.age || null,
        next.location || null,
        next.destination || null,
        next.dates || null,
        next.type,
        next.bio || '',
        JSON.stringify(next.interests),
        req.auth.id
      ]
    );

    const updated = await get('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    res.json({ user: mapUser(updated) });
  } catch (error) {
    console.error('Profile update error', error);
    res.status(500).json({ error: 'Could not update your profile.' });
  }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await all(
      `
        SELECT *
        FROM users
        WHERE id != ?
        ORDER BY joined_at DESC
      `,
      [req.auth.id]
    );
    res.json({ users: users.map(mapUser) });
  } catch (error) {
    res.status(500).json({ error: 'Could not load users.' });
  }
});

app.get('/api/recommendations', authMiddleware, async (req, res) => {
  try {
    const currentUser = await get('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    const users = await all(
      `
        SELECT *
        FROM users
        WHERE id != ?
          AND id NOT IN (
            SELECT CASE
              WHEN requester_id = ? THEN receiver_id
              ELSE requester_id
            END
            FROM connections
            WHERE (requester_id = ? OR receiver_id = ?)
              AND status = 'accepted'
          )
        ORDER BY joined_at DESC
      `,
      [req.auth.id, req.auth.id, req.auth.id, req.auth.id]
    );

    const recommendations = users
      .map((user) => ({
        ...mapUser(user),
        recommendationScore: computeRecommendationScore(currentUser, user),
        recommendationReasons: computeRecommendationReasons(currentUser, user)
      }))
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 4);

    res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations load error', error);
    res.status(500).json({ error: 'Could not load recommendations.' });
  }
});

app.get('/api/connections', authMiddleware, async (req, res) => {
  try {
    const rows = await all(
      `
        SELECT c.*, u.id AS other_user_id, u.name, u.email, u.age, u.location, u.destination, u.dates, u.type, u.bio, u.interests, u.joined_at
        FROM connections c
        JOIN users u
          ON u.id = CASE WHEN c.requester_id = ? THEN c.receiver_id ELSE c.requester_id END
        WHERE c.requester_id = ? OR c.receiver_id = ?
        ORDER BY c.updated_at DESC, c.created_at DESC
      `,
      [req.auth.id, req.auth.id, req.auth.id]
    );

    const pendingIncoming = rows
      .filter((row) => row.status === 'pending' && row.receiver_id === req.auth.id)
      .map((row) => ({ connectionId: String(row.id), ...mapUser({ ...row, id: row.other_user_id }) }));

    const pendingOutgoing = rows
      .filter((row) => row.status === 'pending' && row.requester_id === req.auth.id)
      .map((row) => ({ connectionId: String(row.id), ...mapUser({ ...row, id: row.other_user_id }) }));

    const accepted = rows
      .filter((row) => row.status === 'accepted')
      .map((row) => ({ connectionId: String(row.id), ...mapUser({ ...row, id: row.other_user_id }) }));

    res.json({
      pendingIncoming,
      pendingOutgoing,
      accepted,
      statusMap: makeStatusMap(rows, req.auth.id)
    });
  } catch (error) {
    console.error('Connections load error', error);
    res.status(500).json({ error: 'Could not load connections.' });
  }
});

app.get('/api/groups', authMiddleware, async (req, res) => {
  try {
    const groups = await all(
      `
        SELECT
          g.*,
          u.name AS creator_name,
          COUNT(gm.user_id) AS member_count,
          MAX(CASE WHEN gm.user_id = ? THEN 1 ELSE 0 END) AS joined
        FROM groups_table g
        JOIN users u ON u.id = g.creator_id
        LEFT JOIN group_members gm ON gm.group_id = g.id
        GROUP BY g.id, u.name
        ORDER BY g.created_at DESC
      `,
      [req.auth.id]
    );

    const memberships = await all(
      `
        SELECT
          gm.group_id,
          gm.role,
          gm.joined_at,
          u.*
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
        ORDER BY gm.joined_at ASC
      `
    );

    const membersByGroupId = memberships.reduce((acc, row) => {
      const key = String(row.group_id);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        ...mapUser(row),
        role: row.role,
        joinedAt: row.joined_at
      });
      return acc;
    }, {});

    res.json({
      groups: groups.map((group) => {
        const members = membersByGroupId[String(group.id)] || [];
        return {
          ...mapGroup(group),
          members,
          hasMemberProfiles: members.length > 0
        };
      })
    });
  } catch (error) {
    console.error('Groups load error', error);
    res.status(500).json({ error: 'Could not load groups.' });
  }
});

app.post('/api/groups', authMiddleware, async (req, res) => {
  try {
    const { name, destination, dates, description } = req.body;
    if (!name || !destination || !dates) {
      res.status(400).json({ error: 'Name, destination, and dates are required.' });
      return;
    }

    const result = await run(
      `
        INSERT INTO groups_table (creator_id, name, destination, dates, description)
        VALUES (?, ?, ?, ?, ?)
      `,
      [req.auth.id, name.trim(), destination.trim(), dates.trim(), description?.trim() || '']
    );

    await run(
      `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (?, ?, 'owner')
      `,
      [result.lastID, req.auth.id]
    );

    const createdGroup = await get(
      `
        SELECT
          g.*,
          u.name AS creator_name,
          1 AS member_count,
          1 AS joined
        FROM groups_table g
        JOIN users u ON u.id = g.creator_id
        WHERE g.id = ?
      `,
      [result.lastID]
    );

    res.status(201).json({
      group: {
        ...mapGroup(createdGroup),
        members: [
          {
            ...mapUser(await get('SELECT * FROM users WHERE id = ?', [req.auth.id])),
            role: 'owner'
          }
        ],
        hasMemberProfiles: true
      }
    });
  } catch (error) {
    console.error('Group create error', error);
    res.status(500).json({ error: 'Could not create the group.' });
  }
});

app.post('/api/groups/:id/join', authMiddleware, async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const group = await get('SELECT * FROM groups_table WHERE id = ?', [groupId]);
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    await run(
      `
        INSERT OR IGNORE INTO group_members (group_id, user_id, role)
        VALUES (?, ?, 'member')
      `,
      [groupId, req.auth.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Group join error', error);
    res.status(500).json({ error: 'Could not join the group.' });
  }
});

app.get('/api/groups/:id/messages', authMiddleware, async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!groupId) {
      res.status(400).json({ error: 'A valid group is required.' });
      return;
    }

    if (!(await isGroupMember(groupId, req.auth.id))) {
      res.status(403).json({ error: 'You must join the group before chatting.' });
      return;
    }

    const messages = await all(
      `
        SELECT gm.id, gm.group_id, gm.sender_id, gm.body, gm.sent_at, u.name AS sender_name
        FROM group_messages gm
        JOIN users u ON u.id = gm.sender_id
        WHERE gm.group_id = ?
        ORDER BY gm.sent_at ASC, gm.id ASC
      `,
      [groupId]
    );

    res.json({
      messages: messages.map((message) => ({
        id: String(message.id),
        groupId: String(message.group_id),
        senderId: String(message.sender_id),
        senderName: message.sender_name,
        body: message.body,
        sentAt: message.sent_at
      }))
    });
  } catch (error) {
    console.error('Group message load error', error);
    res.status(500).json({ error: 'Could not load group messages.' });
  }
});

app.post('/api/groups/:id/messages', authMiddleware, async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const body = String(req.body.body || '').trim();

    if (!groupId || !body) {
      res.status(400).json({ error: 'A valid group and message body are required.' });
      return;
    }

    if (!(await isGroupMember(groupId, req.auth.id))) {
      res.status(403).json({ error: 'You must join the group before chatting.' });
      return;
    }

    const result = await run(
      `
        INSERT INTO group_messages (group_id, sender_id, body)
        VALUES (?, ?, ?)
      `,
      [groupId, req.auth.id, body]
    );

    const message = await get(
      `
        SELECT gm.id, gm.group_id, gm.sender_id, gm.body, gm.sent_at, u.name AS sender_name
        FROM group_messages gm
        JOIN users u ON u.id = gm.sender_id
        WHERE gm.id = ?
      `,
      [result.lastID]
    );

    const payload = {
      id: String(message.id),
      groupId: String(message.group_id),
      senderId: String(message.sender_id),
      senderName: message.sender_name,
      body: message.body,
      sentAt: message.sent_at
    };

    io.to(`group:${groupId}`).emit('group:message:new', payload);
    res.status(201).json({ message: payload });
  } catch (error) {
    console.error('Group send message error', error);
    res.status(500).json({ error: 'Could not send your group message.' });
  }
});

app.post('/api/connections/request', authMiddleware, async (req, res) => {
  try {
    const receiverId = Number(req.body.receiverId);
    if (!receiverId) {
      res.status(400).json({ error: 'A target user is required.' });
      return;
    }
    if (receiverId === req.auth.id) {
      res.status(400).json({ error: 'You cannot connect with yourself.' });
      return;
    }

    const receiver = await get('SELECT * FROM users WHERE id = ?', [receiverId]);
    if (!receiver) {
      res.status(404).json({ error: 'That traveler no longer exists.' });
      return;
    }

    const existing = await get(
      `
        SELECT *
        FROM connections
        WHERE
          (requester_id = ? AND receiver_id = ?)
          OR
          (requester_id = ? AND receiver_id = ?)
        ORDER BY id DESC
        LIMIT 1
      `,
      [req.auth.id, receiverId, receiverId, req.auth.id]
    );

    if (existing && existing.status === 'accepted') {
      res.status(409).json({ error: 'You are already connected.' });
      return;
    }

    if (existing && existing.status === 'pending') {
      res.status(409).json({ error: 'A pending request already exists.' });
      return;
    }

    await run(
      `
        INSERT INTO connections (requester_id, receiver_id, status)
        VALUES (?, ?, 'pending')
      `,
      [req.auth.id, receiverId]
    );

    const requester = await get('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    io.to(`user:${receiverId}`).emit('connection:request', { from: mapUser(requester) });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Connection request error', error);
    res.status(500).json({ error: 'Could not send the connection request.' });
  }
});

app.post('/api/connections/accept', authMiddleware, async (req, res) => {
  try {
    const requesterId = Number(req.body.requesterId);
    const pending = await get(
      `
        SELECT *
        FROM connections
        WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'
        ORDER BY id DESC
        LIMIT 1
      `,
      [requesterId, req.auth.id]
    );

    if (!pending) {
      res.status(404).json({ error: 'Pending request not found.' });
      return;
    }

    await run(
      `
        UPDATE connections
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [pending.id]
    );

    const accepter = await get('SELECT * FROM users WHERE id = ?', [req.auth.id]);
    io.to(`user:${requesterId}`).emit('connection:accepted', { by: mapUser(accepter) });
    io.to(`user:${req.auth.id}`).emit('connection:accepted', { by: mapUser(accepter) });
    res.json({ success: true });
  } catch (error) {
    console.error('Connection accept error', error);
    res.status(500).json({ error: 'Could not accept the request.' });
  }
});

app.post('/api/connections/decline', authMiddleware, async (req, res) => {
  try {
    const requesterId = Number(req.body.requesterId);
    const pending = await get(
      `
        SELECT *
        FROM connections
        WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'
        ORDER BY id DESC
        LIMIT 1
      `,
      [requesterId, req.auth.id]
    );

    if (!pending) {
      res.status(404).json({ error: 'Pending request not found.' });
      return;
    }

    await run(
      `
        UPDATE connections
        SET status = 'declined', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [pending.id]
    );

    io.to(`user:${requesterId}`).emit('connection:declined', { byUserId: String(req.auth.id) });
    res.json({ success: true });
  } catch (error) {
    console.error('Connection decline error', error);
    res.status(500).json({ error: 'Could not decline the request.' });
  }
});

app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const otherUserId = Number(req.params.userId);
    if (!(await areConnected(req.auth.id, otherUserId))) {
      res.status(403).json({ error: 'You must be connected before chatting.' });
      return;
    }

    const messages = await all(
      `
        SELECT id, sender_id, receiver_id, body, sent_at
        FROM messages
        WHERE
          (sender_id = ? AND receiver_id = ?)
          OR
          (sender_id = ? AND receiver_id = ?)
        ORDER BY sent_at ASC, id ASC
      `,
      [req.auth.id, otherUserId, otherUserId, req.auth.id]
    );

    res.json({
      messages: messages.map((message) => ({
        id: String(message.id),
        senderId: String(message.sender_id),
        receiverId: String(message.receiver_id),
        body: message.body,
        sentAt: message.sent_at
      }))
    });
  } catch (error) {
    console.error('Message load error', error);
    res.status(500).json({ error: 'Could not load messages.' });
  }
});

app.post('/api/messages', authMiddleware, async (req, res) => {
  try {
    const receiverId = Number(req.body.receiverId);
    const body = String(req.body.body || '').trim();

    if (!receiverId || !body) {
      res.status(400).json({ error: 'A recipient and message body are required.' });
      return;
    }

    if (!(await areConnected(req.auth.id, receiverId))) {
      res.status(403).json({ error: 'You must be connected before chatting.' });
      return;
    }

    const result = await run(
      `
        INSERT INTO messages (sender_id, receiver_id, body)
        VALUES (?, ?, ?)
      `,
      [req.auth.id, receiverId, body]
    );

    const message = await get('SELECT * FROM messages WHERE id = ?', [result.lastID]);
    const payload = {
      id: String(message.id),
      senderId: String(message.sender_id),
      receiverId: String(message.receiver_id),
      body: message.body,
      sentAt: message.sent_at
    };

    io.to(`user:${req.auth.id}`).emit('message:new', payload);
    io.to(`user:${receiverId}`).emit('message:new', payload);
    res.status(201).json({ message: payload });
  } catch (error) {
    console.error('Send message error', error);
    res.status(500).json({ error: 'Could not send your message.' });
  }
});

app.post('/api/ollama/generate', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    res.status(response.status);
    res.type(response.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (error) {
    console.error('Ollama proxy error', error);
    res.status(502).json({ error: 'Could not reach Ollama.' });
  }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      next(new Error('Authentication required.'));
      return;
    }

    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    next(new Error('Invalid token.'));
  }
});

io.on('connection', async (socket) => {
  socket.join(`user:${socket.user.id}`);
  try {
    const memberships = await all(
      `
        SELECT group_id
        FROM group_members
        WHERE user_id = ?
      `,
      [socket.user.id]
    );
    memberships.forEach((membership) => {
      socket.join(`group:${membership.group_id}`);
    });
  } catch (error) {
    console.error('Socket group join error', error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Roam.ai running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });

const bcrypt = require('bcryptjs');
const { db, initDb, run } = require('../db');

const DEMO_PASSWORD = 'DemoTrip123!';

const users = [
  {
    name: 'Maya Chen',
    email: 'maya.chen.demo@xpedition.local',
    location: 'San Francisco, USA',
    destination: 'Lisbon, Portugal',
    dates: 'April 12 - April 20',
    type: 'seeking',
    bio: 'Designer on a spring workcation who wants coffee walks, tiled streets, and golden-hour viewpoints.',
    interests: ['Culture', 'Food', 'Photography', 'Art']
  },
  {
    name: 'Leo Martinez',
    email: 'leo.martinez.demo@xpedition.local',
    location: 'Austin, USA',
    destination: 'Mexico City, Mexico',
    dates: 'May 3 - May 10',
    type: 'offering',
    bio: 'Frequent flyer who loves street food, architecture, and finding live music after dark.',
    interests: ['Food', 'Nightlife', 'Culture', 'Art']
  },
  {
    name: 'Aisha Rahman',
    email: 'aisha.rahman.demo@xpedition.local',
    location: 'Chicago, USA',
    destination: 'Marrakech, Morocco',
    dates: 'May 18 - May 25',
    type: 'seeking',
    bio: 'Solo traveler looking for markets, riads, rooftop tea, and a calm travel buddy.',
    interests: ['Culture', 'Shopping', 'Food', 'Photography']
  },
  {
    name: 'Noah Brooks',
    email: 'noah.brooks.demo@xpedition.local',
    location: 'Denver, USA',
    destination: 'Banff, Canada',
    dates: 'June 8 - June 15',
    type: 'offering',
    bio: 'Outdoor-first traveler chasing alpine lakes, hikes, and sunrise spots.',
    interests: ['Adventure', 'Nature', 'Photography', 'Wellness']
  },
  {
    name: 'Sofia Alvarez',
    email: 'sofia.alvarez.demo@xpedition.local',
    location: 'Miami, USA',
    destination: 'Rio de Janeiro, Brazil',
    dates: 'June 12 - June 19',
    type: 'seeking',
    bio: 'Beach lover who wants samba nights, viewpoints, and one unforgettable sunset boat ride.',
    interests: ['Nature', 'Nightlife', 'Food', 'Adventure']
  },
  {
    name: 'Ethan Park',
    email: 'ethan.park.demo@xpedition.local',
    location: 'Seattle, USA',
    destination: 'Kyoto, Japan',
    dates: 'September 2 - September 11',
    type: 'seeking',
    bio: 'Slow traveler into temples, tea shops, train rides, and beautifully quiet mornings.',
    interests: ['Culture', 'Food', 'Wellness', 'Photography']
  },
  {
    name: 'Isabella Rossi',
    email: 'isabella.rossi.demo@xpedition.local',
    location: 'New York, USA',
    destination: 'Florence, Italy',
    dates: 'July 7 - July 14',
    type: 'offering',
    bio: 'Art-history enthusiast who builds trips around pasta, museums, and sunset walks.',
    interests: ['Art', 'Culture', 'Food', 'Photography']
  },
  {
    name: 'Daniel Kim',
    email: 'daniel.kim.demo@xpedition.local',
    location: 'Los Angeles, USA',
    destination: 'Seoul, South Korea',
    dates: 'October 1 - October 9',
    type: 'offering',
    bio: 'Tech consultant visiting friends and always down for cafes, design stores, and great late-night eats.',
    interests: ['Food', 'Shopping', 'Nightlife', 'Art']
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair.demo@xpedition.local',
    location: 'Boston, USA',
    destination: 'Bali, Indonesia',
    dates: 'August 15 - August 24',
    type: 'seeking',
    bio: 'Remote worker craving a balanced mix of yoga, beach clubs, and jungle day trips.',
    interests: ['Wellness', 'Nature', 'Food', 'Adventure']
  },
  {
    name: 'Jack Turner',
    email: 'jack.turner.demo@xpedition.local',
    location: 'Portland, USA',
    destination: 'Queenstown, New Zealand',
    dates: 'November 5 - November 14',
    type: 'offering',
    bio: 'Adventure junkie who will say yes to every hike, jet boat, and mountain overlook.',
    interests: ['Adventure', 'Nature', 'Photography', 'Nightlife']
  },
  {
    name: 'Camila Ortega',
    email: 'camila.ortega.demo@xpedition.local',
    location: 'Houston, USA',
    destination: 'Buenos Aires, Argentina',
    dates: 'September 12 - September 20',
    type: 'seeking',
    bio: 'Loves neighborhoods with personality, tango bars, bookstores, and long dinners.',
    interests: ['Culture', 'Food', 'Nightlife', 'Art']
  },
  {
    name: 'Owen Patel',
    email: 'owen.patel.demo@xpedition.local',
    location: 'Atlanta, USA',
    destination: 'Cape Town, South Africa',
    dates: 'December 2 - December 10',
    type: 'offering',
    bio: 'Wildlife and wine-country fan building a trip around scenic drives and coastal hikes.',
    interests: ['Nature', 'Adventure', 'Food', 'Photography']
  },
  {
    name: 'Hannah Lee',
    email: 'hannah.lee.demo@xpedition.local',
    location: 'Toronto, Canada',
    destination: 'Reykjavik, Iceland',
    dates: 'January 18 - January 25',
    type: 'seeking',
    bio: 'Chasing northern lights, hot springs, and dramatic landscapes with a small-group vibe.',
    interests: ['Nature', 'Wellness', 'Adventure', 'Photography']
  },
  {
    name: 'Marcus Johnson',
    email: 'marcus.johnson.demo@xpedition.local',
    location: 'Philadelphia, USA',
    destination: 'Barcelona, Spain',
    dates: 'April 28 - May 6',
    type: 'offering',
    bio: 'Planning a social city break full of tapas, architecture, beach afternoons, and live music.',
    interests: ['Food', 'Culture', 'Nightlife', 'Art']
  },
  {
    name: 'Zoe Bennett',
    email: 'zoe.bennett.demo@xpedition.local',
    location: 'San Diego, USA',
    destination: 'Santorini, Greece',
    dates: 'June 20 - June 27',
    type: 'seeking',
    bio: 'Looking for someone who loves sea views, boutique stays, and relaxing island pacing.',
    interests: ['Nature', 'Wellness', 'Photography', 'Food']
  },
  {
    name: 'Arjun Singh',
    email: 'arjun.singh.demo@xpedition.local',
    location: 'Dallas, USA',
    destination: 'Singapore, Singapore',
    dates: 'October 14 - October 21',
    type: 'offering',
    bio: 'Enjoys hyper-efficient city trips with hawker food, skyline spots, and a little luxury.',
    interests: ['Food', 'Shopping', 'Art', 'Nightlife']
  },
  {
    name: 'Grace Wilson',
    email: 'grace.wilson.demo@xpedition.local',
    location: 'Washington, USA',
    destination: 'Cusco, Peru',
    dates: 'July 16 - July 24',
    type: 'seeking',
    bio: 'Looking for a travel partner for altitude-friendly pacing, markets, ruins, and one big trek.',
    interests: ['Adventure', 'Culture', 'Nature', 'Food']
  },
  {
    name: 'Rafael Torres',
    email: 'rafael.torres.demo@xpedition.local',
    location: 'Phoenix, USA',
    destination: 'Medellin, Colombia',
    dates: 'August 3 - August 11',
    type: 'offering',
    bio: 'Coffee, city views, day trips, and a lively social scene are the whole plan.',
    interests: ['Nightlife', 'Food', 'Culture', 'Nature']
  }
];

const connections = [
  ['maya.chen.demo@xpedition.local', 'isabella.rossi.demo@xpedition.local', 'accepted'],
  ['maya.chen.demo@xpedition.local', 'marcus.johnson.demo@xpedition.local', 'pending'],
  ['leo.martinez.demo@xpedition.local', 'rafael.torres.demo@xpedition.local', 'accepted'],
  ['aisha.rahman.demo@xpedition.local', 'maya.chen.demo@xpedition.local', 'pending'],
  ['noah.brooks.demo@xpedition.local', 'hannah.lee.demo@xpedition.local', 'accepted'],
  ['sofia.alvarez.demo@xpedition.local', 'camila.ortega.demo@xpedition.local', 'accepted'],
  ['ethan.park.demo@xpedition.local', 'priya.nair.demo@xpedition.local', 'pending'],
  ['jack.turner.demo@xpedition.local', 'owen.patel.demo@xpedition.local', 'accepted'],
  ['grace.wilson.demo@xpedition.local', 'rafael.torres.demo@xpedition.local', 'pending'],
  ['arjun.singh.demo@xpedition.local', 'daniel.kim.demo@xpedition.local', 'accepted']
];

const directMessages = [
  ['maya.chen.demo@xpedition.local', 'isabella.rossi.demo@xpedition.local', 'I saw you are headed to Florence too. Want to compare museum must-sees?'],
  ['isabella.rossi.demo@xpedition.local', 'maya.chen.demo@xpedition.local', 'Absolutely. I already have a shortlist for Uffizi and a couple of sunset aperitivo spots.'],
  ['leo.martinez.demo@xpedition.local', 'rafael.torres.demo@xpedition.local', 'If we overlap in Medellin we should do a coffee day trip.'],
  ['rafael.torres.demo@xpedition.local', 'leo.martinez.demo@xpedition.local', 'Yes. I also found a rooftop bar that would be perfect after.'],
  ['noah.brooks.demo@xpedition.local', 'hannah.lee.demo@xpedition.local', 'Banff and Iceland are very different, but we should definitely trade packing lists.'],
  ['hannah.lee.demo@xpedition.local', 'noah.brooks.demo@xpedition.local', 'Deal. I can help with layers if you help me with camera gear.']
];

const groups = [
  {
    creator: 'maya.chen.demo@xpedition.local',
    name: 'Europe Spring Creatives',
    destination: 'Lisbon, Portugal',
    dates: 'April 10 - April 22',
    description: 'A small demo group for cafe hopping, design museums, and golden-hour walks.',
    members: [
      'maya.chen.demo@xpedition.local',
      'isabella.rossi.demo@xpedition.local',
      'marcus.johnson.demo@xpedition.local',
      'zoe.bennett.demo@xpedition.local'
    ],
    messages: [
      ['maya.chen.demo@xpedition.local', 'I made this group so we can swap itinerary ideas before everyone flies out.'],
      ['marcus.johnson.demo@xpedition.local', 'Perfect. I can share my Barcelona and Lisbon food map.']
    ]
  },
  {
    creator: 'noah.brooks.demo@xpedition.local',
    name: 'Summer Adventure Circuit',
    destination: 'Banff, Canada',
    dates: 'June 8 - July 24',
    description: 'For hikers, photographers, and anyone who wants an active summer route.',
    members: [
      'noah.brooks.demo@xpedition.local',
      'hannah.lee.demo@xpedition.local',
      'grace.wilson.demo@xpedition.local',
      'jack.turner.demo@xpedition.local'
    ],
    messages: [
      ['noah.brooks.demo@xpedition.local', 'Let us keep this one focused on routes, gear, and best sunrise spots.'],
      ['grace.wilson.demo@xpedition.local', 'I am mostly here for trekking ideas and realistic pacing tips.']
    ]
  },
  {
    creator: 'leo.martinez.demo@xpedition.local',
    name: 'Food Cities Collective',
    destination: 'Mexico City, Mexico',
    dates: 'May 1 - August 15',
    description: 'A demo group for travelers who plan around restaurants, markets, and nightlife.',
    members: [
      'leo.martinez.demo@xpedition.local',
      'rafael.torres.demo@xpedition.local',
      'camila.ortega.demo@xpedition.local',
      'arjun.singh.demo@xpedition.local',
      'sofia.alvarez.demo@xpedition.local'
    ],
    messages: [
      ['leo.martinez.demo@xpedition.local', 'Dropping this here so everyone can share food lists and favorite neighborhoods.'],
      ['camila.ortega.demo@xpedition.local', 'Please start with your best late dinner recommendations.']
    ]
  }
];

async function resetTables() {
  await run('PRAGMA foreign_keys = OFF');
  await run('DELETE FROM group_messages');
  await run('DELETE FROM group_members');
  await run('DELETE FROM groups_table');
  await run('DELETE FROM messages');
  await run('DELETE FROM connections');
  await run('DELETE FROM users');
  await run('DELETE FROM sqlite_sequence');
  await run('PRAGMA foreign_keys = ON');
}

async function insertUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const idByEmail = new Map();

  for (const user of users) {
    const result = await run(
      `
        INSERT INTO users (name, email, password_hash, age, location, destination, dates, type, bio, interests)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.name,
        user.email,
        passwordHash,
        null,
        user.location,
        user.destination,
        user.dates,
        user.type,
        user.bio,
        JSON.stringify(user.interests)
      ]
    );
    idByEmail.set(user.email, result.lastID);
  }

  return idByEmail;
}

async function insertConnections(idByEmail) {
  for (const [requesterEmail, receiverEmail, status] of connections) {
    await run(
      `
        INSERT INTO connections (requester_id, receiver_id, status)
        VALUES (?, ?, ?)
      `,
      [idByEmail.get(requesterEmail), idByEmail.get(receiverEmail), status]
    );
  }
}

async function insertDirectMessages(idByEmail) {
  for (const [senderEmail, receiverEmail, body] of directMessages) {
    await run(
      `
        INSERT INTO messages (sender_id, receiver_id, body)
        VALUES (?, ?, ?)
      `,
      [idByEmail.get(senderEmail), idByEmail.get(receiverEmail), body]
    );
  }
}

async function insertGroups(idByEmail) {
  for (const group of groups) {
    const groupResult = await run(
      `
        INSERT INTO groups_table (creator_id, name, destination, dates, description)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        idByEmail.get(group.creator),
        group.name,
        group.destination,
        group.dates,
        group.description
      ]
    );

    for (const memberEmail of group.members) {
      const role = memberEmail === group.creator ? 'creator' : 'member';
      await run(
        `
          INSERT INTO group_members (group_id, user_id, role)
          VALUES (?, ?, ?)
        `,
        [groupResult.lastID, idByEmail.get(memberEmail), role]
      );
    }

    for (const [senderEmail, body] of group.messages) {
      await run(
        `
          INSERT INTO group_messages (group_id, sender_id, body)
          VALUES (?, ?, ?)
        `,
        [groupResult.lastID, idByEmail.get(senderEmail), body]
      );
    }
  }
}

async function main() {
  await initDb();
  await resetTables();
  const idByEmail = await insertUsers();
  await insertConnections(idByEmail);
  await insertDirectMessages(idByEmail);
  await insertGroups(idByEmail);

  console.log(`Demo reseed complete.
Users: ${users.length}
Shared password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Demo reseed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });

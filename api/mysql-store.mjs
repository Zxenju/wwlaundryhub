import mysql from 'mysql2/promise';

let pool;
let initialization;

export function isMysqlConfigured() {
  return Boolean(
    process.env.DATABASE_URL
    || (process.env.MYSQLHOST && process.env.MYSQLUSER && process.env.MYSQLDATABASE),
  );
}

function getPool() {
  if (pool) return pool;

  if (process.env.DATABASE_URL) {
    const connection = new URL(process.env.DATABASE_URL);
    pool = mysql.createPool({
      host: connection.hostname,
      port: Number(connection.port || 3306),
      user: decodeURIComponent(connection.username),
      password: decodeURIComponent(connection.password),
      database: decodeURIComponent(connection.pathname.replace(/^\//, '')),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
    });
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
  });
  return pool;
}

export async function initializeMysqlStore() {
  if (!isMysqlConfigured()) throw new Error('MySQL is not configured. Set DATABASE_URL or Railway MYSQL* variables.');
  if (!initialization) {
    initialization = (async () => {
      const connection = getPool();
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS bookings (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          status VARCHAR(32) NOT NULL,
          booking_date CHAR(10) NOT NULL,
          pickup_date CHAR(10) NOT NULL,
          weight_kg DECIMAL(10, 5) NOT NULL,
          payment_status VARCHAR(12) NOT NULL,
          created_at VARCHAR(32) NOT NULL,
          booking_data JSON NOT NULL,
          INDEX idx_bookings_status (status),
          INDEX idx_bookings_booking_date (booking_date),
          INDEX idx_bookings_pickup_date (pickup_date),
          INDEX idx_bookings_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS app_settings (
          setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
          setting_data JSON NOT NULL,
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
            ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS booking_status_history (
          booking_id VARCHAR(36) NOT NULL,
          position INT UNSIGNED NOT NULL,
          status VARCHAR(32) NOT NULL,
          changed_at VARCHAR(32) NOT NULL,
          PRIMARY KEY (booking_id, position),
          CONSTRAINT fk_status_history_booking FOREIGN KEY (booking_id)
            REFERENCES bookings (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
}

function decodeJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export async function readMysqlStore(defaultPricing) {
  await initializeMysqlStore();
  const connection = getPool();
  let [settings] = await connection.execute(
    'SELECT setting_data FROM app_settings WHERE setting_key = ?',
    ['pricing'],
  );

  if (settings.length === 0) {
    await connection.execute(
      'INSERT IGNORE INTO app_settings (setting_key, setting_data) VALUES (?, ?)',
      ['pricing', JSON.stringify(defaultPricing)],
    );
    [settings] = await connection.execute(
      'SELECT setting_data FROM app_settings WHERE setting_key = ?',
      ['pricing'],
    );
  }

  const [rows] = await connection.execute(
    'SELECT booking_data FROM bookings ORDER BY created_at DESC, id DESC',
  );
  const [historyRows] = await connection.execute(
    'SELECT booking_id, status, changed_at FROM booking_status_history ORDER BY booking_id, position',
  );
  const historyByBooking = new Map();
  for (const row of historyRows) {
    const events = historyByBooking.get(row.booking_id) ?? [];
    events.push({ status: row.status, changedAt: row.changed_at });
    historyByBooking.set(row.booking_id, events);
  }
  return {
    bookings: rows.map((row) => {
      const booking = decodeJson(row.booking_data);
      return {
        ...booking,
        statusHistory: historyByBooking.get(booking.id) ?? booking.statusHistory ?? [],
      };
    }),
    pricing: decodeJson(settings[0].setting_data),
  };
}

export async function saveMysqlPricing(pricing) {
  await initializeMysqlStore();
  await getPool().execute(
    `INSERT INTO app_settings (setting_key, setting_data) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_data = VALUES(setting_data)`,
    ['pricing', JSON.stringify(pricing)],
  );
}

export async function saveMysqlBooking(booking, { insertOnly = false } = {}) {
  await initializeMysqlStore();
  const connection = await getPool().getConnection();
  const bookingData = { ...booking };
  delete bookingData.statusHistory;
  const query = insertOnly
    ? `INSERT INTO bookings (id, status, booking_date, pickup_date, weight_kg, payment_status, created_at, booking_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    : `INSERT INTO bookings (id, status, booking_date, pickup_date, weight_kg, payment_status, created_at, booking_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), booking_date = VALUES(booking_date),
         pickup_date = VALUES(pickup_date), weight_kg = VALUES(weight_kg),
         payment_status = VALUES(payment_status), created_at = VALUES(created_at),
         booking_data = VALUES(booking_data)`;
  try {
    await connection.beginTransaction();
    await connection.execute(query, [
      booking.id,
      booking.status,
      booking.bookingDate,
      booking.pickupDate,
      booking.weightKg,
      booking.payment?.status ?? 'Unpaid',
      booking.createdAt,
      JSON.stringify(bookingData),
    ]);
    await connection.execute('DELETE FROM booking_status_history WHERE booking_id = ?', [booking.id]);
    for (const [position, event] of (booking.statusHistory ?? []).entries()) {
      await connection.execute(
        'INSERT INTO booking_status_history (booking_id, position, status, changed_at) VALUES (?, ?, ?, ?)',
        [booking.id, position, event.status, event.changedAt],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteMysqlBooking(id) {
  await initializeMysqlStore();
  await getPool().execute('DELETE FROM bookings WHERE id = ?', [id]);
}

export async function importMysqlData(bookings, pricing, { replacePricing = false } = {}) {
  await initializeMysqlStore();
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    if (replacePricing) {
      await connection.execute(
        `INSERT INTO app_settings (setting_key, setting_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_data = VALUES(setting_data)`,
        ['pricing', JSON.stringify(pricing)],
      );
    } else {
      await connection.execute(
        'INSERT IGNORE INTO app_settings (setting_key, setting_data) VALUES (?, ?)',
        ['pricing', JSON.stringify(pricing)],
      );
    }
    for (const booking of bookings) {
      const bookingData = { ...booking };
      delete bookingData.statusHistory;
      const [result] = await connection.execute(
        `INSERT IGNORE INTO bookings
          (id, status, booking_date, pickup_date, weight_kg, payment_status, created_at, booking_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          booking.id,
          booking.status,
          booking.bookingDate,
          booking.pickupDate,
          booking.weightKg,
          booking.payment?.status ?? 'Unpaid',
          booking.createdAt,
          JSON.stringify(bookingData),
        ],
      );
      if (result.affectedRows === 1) {
        for (const [position, event] of (booking.statusHistory ?? []).entries()) {
          await connection.execute(
            'INSERT INTO booking_status_history (booking_id, position, status, changed_at) VALUES (?, ?, ?, ?)',
            [booking.id, position, event.status, event.changedAt],
          );
        }
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

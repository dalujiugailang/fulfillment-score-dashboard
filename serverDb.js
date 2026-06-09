import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DuckDBInstance, quotedString } from '@duckdb/node-api';
import {
  DEFAULT_SCORE_ROWS,
  WEEKLY_PERIODS,
  allocationDefaults,
  createEmptyRows,
  recalculateRow
} from './serverData.js';

let conn;

const q = value => quotedString(String(value ?? ''));

const hashPassword = (password, salt) => crypto.scryptSync(String(password), salt, 64).toString('hex');

export const verifyPassword = (password, salt, expectedHash) => {
  const passwordHash = hashPassword(password, salt);
  const left = Buffer.from(passwordHash, 'hex');
  const right = Buffer.from(String(expectedHash), 'hex');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const getCount = async sql => {
  const rows = (await conn.runAndReadAll(sql)).getRows();
  return Number(rows[0]?.[0] || 0);
};

const runMany = async statements => {
  await conn.run('BEGIN TRANSACTION');
  try {
    for (const statement of statements) {
      await conn.run(statement);
    }
    await conn.run('COMMIT');
  } catch (error) {
    await conn.run('ROLLBACK');
    throw error;
  }
};

export const initDatabase = async (dbPath, accountSeeds = []) => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const instance = await DuckDBInstance.create(dbPath);
  conn = await instance.connect();

  await conn.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      username VARCHAR PRIMARY KEY,
      password_hash VARCHAR NOT NULL,
      password_salt VARCHAR NOT NULL,
      session_json VARCHAR NOT NULL,
      updated_at TIMESTAMP DEFAULT now()
    )
  `);
  await conn.run(`
    CREATE TABLE IF NOT EXISTS period_rows (
      period_id VARCHAR NOT NULL,
      provider VARCHAR NOT NULL,
      row_json VARCHAR NOT NULL,
      updated_at TIMESTAMP DEFAULT now(),
      PRIMARY KEY (period_id, provider)
    )
  `);
  await conn.run(`
    CREATE TABLE IF NOT EXISTS upload_history (
      id VARCHAR PRIMARY KEY,
      uploaded_at VARCHAR NOT NULL,
      source_type VARCHAR NOT NULL,
      period VARCHAR NOT NULL,
      file_name VARCHAR NOT NULL,
      row_count INTEGER NOT NULL,
      matched_providers_json VARCHAR NOT NULL,
      status VARCHAR NOT NULL,
      message VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    )
  `);
  await conn.run(`
    CREATE TABLE IF NOT EXISTS upload_source_rows (
      id VARCHAR PRIMARY KEY,
      upload_id VARCHAR NOT NULL,
      row_index INTEGER NOT NULL,
      row_json VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    )
  `);
  await conn.run(`
    CREATE TABLE IF NOT EXISTS allocation_summary (
      provider VARCHAR PRIMARY KEY,
      province_count INTEGER NOT NULL,
      provinces_json VARCHAR NOT NULL
    )
  `);

  if (await getCount('SELECT count(*) FROM period_rows') === 0) {
    await savePeriodRows('P01', DEFAULT_SCORE_ROWS);
  }
  if (await getCount('SELECT count(*) FROM allocation_summary') === 0) {
    await runMany(allocationDefaults.map(row => `
      INSERT INTO allocation_summary VALUES (
        ${q(row.provider)},
        ${Number(row.provinceCount)},
        ${q(JSON.stringify(row.provinces))}
      )
    `));
  }
  if (accountSeeds.length > 0) {
    await saveAccounts(accountSeeds);
  }
};

export const saveAccounts = async accounts => {
  await runMany(accounts.flatMap(account => {
    const salt = crypto.randomBytes(16).toString('hex');
    return [
      `DELETE FROM accounts WHERE username = ${q(account.username)}`,
      `
        INSERT INTO accounts (username, password_hash, password_salt, session_json)
        VALUES (
          ${q(account.username)},
          ${q(hashPassword(account.password, salt))},
          ${q(salt)},
          ${q(JSON.stringify(account.session))}
        )
      `
    ];
  }));
};

export const getAccountByUsername = async username => {
  const records = (await conn.runAndReadAll(`
    SELECT username, password_hash, password_salt, session_json
    FROM accounts
    WHERE username = ${q(username)}
    LIMIT 1
  `)).getRowObjects();

  const record = records[0];
  if (!record) return null;
  return {
    username: String(record.username),
    passwordHash: String(record.password_hash),
    passwordSalt: String(record.password_salt),
    session: JSON.parse(String(record.session_json))
  };
};

export const getPeriodRowsById = async () => {
  const records = (await conn.runAndReadAll('SELECT period_id, row_json FROM period_rows ORDER BY period_id, provider')).getRowObjects();
  return records.reduce((acc, record) => {
    const periodId = String(record.period_id);
    acc[periodId] = acc[periodId] || [];
    acc[periodId].push(recalculateRow(JSON.parse(String(record.row_json))));
    return acc;
  }, {});
};

export const getRowsForPeriod = async periodId => {
  const rows = (await conn.runAndReadAll(`
    SELECT row_json FROM period_rows
    WHERE period_id = ${q(periodId)}
    ORDER BY provider
  `)).getRowObjects().map(record => recalculateRow(JSON.parse(String(record.row_json))));

  if (rows.length > 0) return rows;
  const period = WEEKLY_PERIODS.find(item => item.id === periodId) || WEEKLY_PERIODS[0];
  return createEmptyRows(period.range);
};

export const savePeriodRows = async (periodId, rows) => {
  await runMany([
    `DELETE FROM period_rows WHERE period_id = ${q(periodId)}`,
    ...rows.map(row => {
      const next = recalculateRow(row);
      return `
        INSERT INTO period_rows (period_id, provider, row_json)
        VALUES (${q(periodId)}, ${q(next.provider)}, ${q(JSON.stringify(next))})
      `;
    })
  ]);
};

export const resetPeriodRows = async period => {
  await savePeriodRows(period.id, period.id === 'P01' ? DEFAULT_SCORE_ROWS : createEmptyRows(period.range));
};

export const getUploadHistory = async () => {
  const records = (await conn.runAndReadAll(`
    SELECT id, uploaded_at, source_type, period, file_name, row_count, matched_providers_json, status, message
    FROM upload_history
    ORDER BY created_at DESC
    LIMIT 50
  `)).getRowObjects();

  return records.map(record => ({
    id: String(record.id),
    uploadedAt: String(record.uploaded_at),
    sourceType: record.source_type,
    period: String(record.period),
    fileName: String(record.file_name),
    rowCount: Number(record.row_count),
    matchedProviders: JSON.parse(String(record.matched_providers_json)),
    status: record.status,
    message: String(record.message)
  }));
};

export const saveUploadRecord = async (entry, sourceRows = []) => {
  await runMany([
    `
      INSERT INTO upload_history (
        id, uploaded_at, source_type, period, file_name, row_count, matched_providers_json, status, message
      ) VALUES (
        ${q(entry.id)},
        ${q(entry.uploadedAt)},
        ${q(entry.sourceType)},
        ${q(entry.period)},
        ${q(entry.fileName)},
        ${Number(entry.rowCount || 0)},
        ${q(JSON.stringify(entry.matchedProviders || []))},
        ${q(entry.status)},
        ${q(entry.message)}
      )
    `,
    ...sourceRows.map((row, index) => `
      INSERT INTO upload_source_rows (id, upload_id, row_index, row_json)
      VALUES (
        ${q(`${entry.id}:${index}`)},
        ${q(entry.id)},
        ${index},
        ${q(JSON.stringify(row))}
      )
    `)
  ]);
};

export const getAllocationSummary = async provider => {
  const where = provider ? `WHERE provider = ${q(provider)}` : '';
  const records = (await conn.runAndReadAll(`
    SELECT provider, province_count, provinces_json
    FROM allocation_summary
    ${where}
    ORDER BY provider
  `)).getRowObjects();

  return records.map(record => ({
    provider: String(record.provider),
    provinceCount: Number(record.province_count),
    provinces: JSON.parse(String(record.provinces_json))
  }));
};

export const getUploadedPeriodCount = async () => {
  const rows = (await conn.runAndReadAll(`
    SELECT period_id, row_json FROM period_rows
  `)).getRowObjects();

  const uploadedPeriods = new Set();
  rows.forEach(record => {
    const row = JSON.parse(String(record.row_json));
    if (row.hasScoreSource || row.hasComplaintSource) {
      uploadedPeriods.add(String(record.period_id));
    }
  });

  return uploadedPeriods.size;
};

import crypto from 'node:crypto';
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WEEKLY_PERIODS,
  aggregatePeriodRows,
  recalculateRow
} from './serverData.js';
import {
  getAccountByUsername,
  getAllocationSummary,
  getPeriodRowsById,
  getRowsForPeriod as getStoredRowsForPeriod,
  getUploadHistory,
  getUploadedPeriodCount,
  initDatabase,
  resetPeriodRows,
  savePeriodRows,
  saveUploadRecord,
  verifyPassword
} from './serverDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const sessions = new Map();

const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DUCKDB_PATH = process.env.DUCKDB_PATH || path.join(DATA_DIR, 'fulfillment.duckdb');

const accounts = [
  {
    username: 'dalujiugailang',
    password: process.env.ADMIN_PASSWORD,
    session: {
      role: 'admin',
      userName: '张运营-管理主岗',
      email: 'dalujiugailang@gmail.com',
      avatarColor: '#2563EB'
    }
  },
  {
    username: 'provider_qingyang',
    password: process.env.QINGYANG_PASSWORD,
    session: {
      role: 'qingyang',
      userName: '清洋-数据专员',
      email: 'qy_service@corp.com',
      avatarColor: '#3B82F6'
    }
  },
  {
    username: 'provider_haijing',
    password: process.env.HAIJING_PASSWORD,
    session: {
      role: 'haijing',
      userName: '海鲸-负责人',
      email: 'hj_vip@corp.com',
      avatarColor: '#7C3AED'
    }
  },
  {
    username: 'provider_xiaozhi',
    password: process.env.XIAOZHI_PASSWORD,
    session: {
      role: 'xiaozhi',
      userName: '小智-数据专员',
      email: 'xz_service@corp.com',
      avatarColor: '#10B981'
    }
  }
];

const roleProviderMap = {
  qingyang: '清洋',
  haijing: '海鲸',
  xiaozhi: '小智'
};

const requiredEnv = ['ADMIN_PASSWORD', 'QINGYANG_PASSWORD', 'HAIJING_PASSWORD', 'XIAOZHI_PASSWORD'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

app.use(express.json({ limit: '20mb' }));

const getToken = req => {
  const authHeader = req.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
};

const getSessionByToken = token => {
  const record = sessions.get(token);
  if (!record || record.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return record.session;
};

const requireAuth = (req, res, next) => {
  const token = getToken(req);
  const session = getSessionByToken(token);
  if (!session) {
    return res.status(401).json({ message: '登录已失效' });
  }
  req.session = session;
  return next();
};

const requireAdmin = (req, res, next) => {
  if (req.session?.role !== 'admin') {
    return res.status(403).json({ message: '无权限' });
  }
  return next();
};

const getSessionProvider = session => roleProviderMap[session.role] || null;

const createAnonymousOverviewRow = (row, rank) => ({
  ...row,
  provider: `匿名服务商${rank}`,
  companyName: '匿名服务商',
  submittedOrders: 0,
  closedOrders: 0,
  bargainOrderCount: 0,
  bargainSubmittedAmount: 0,
  bargainClosedAmount: 0,
  onTimeVisitOrders: 0,
  visitTotalOrders: 0,
  onTimePayoutOrders: 0,
  payoutTotalOrders: 0,
  dealRate: 0,
  bargainRate: 0,
  complaintRate: 0,
  onTimeVisitRate: 0,
  onTimePayoutRate: 0,
  dealRateScore: 0,
  onTimeVisitRateScore: 0,
  onTimePayoutRateScore: 0,
  bargainRateScore: 0,
  complaintRateScore: 0,
  flyOrderScore: 0,
  flyOrderCount: 0,
  hasScoreSource: true,
  hasComplaintSource: true,
  isAnonymous: true,
  isCurrentProvider: false,
  displayRank: rank
});

const getRankMap = rows => new Map(
  [...rows]
    .sort((a, b) => {
      if (a.hasScoreSource !== b.hasScoreSource) return a.hasScoreSource ? -1 : 1;
      return b.totalScore - a.totalScore;
    })
    .map((row, index) => [row.provider, index + 1])
);

const sanitizeOverviewRows = (rows, sessionProvider, isAdmin) => {
  if (isAdmin) return rows;
  const rankMap = getRankMap(rows);
  return rows.map(row => {
    const rank = rankMap.get(row.provider) || 0;
    if (row.provider === sessionProvider) {
      return {
        ...row,
        actualProvider: row.provider,
        isAnonymous: false,
        isCurrentProvider: true,
        displayRank: rank
      };
    }
    return createAnonymousOverviewRow(row, rank);
  });
};

const getRowsForPeriod = async periodId => {
  if (periodId === 'ALL') return aggregatePeriodRows(await getPeriodRowsById());
  return getStoredRowsForPeriod(periodId);
};

const buildDashboardPayload = async (session, periodId = 'ALL') => {
  const isAdmin = session.role === 'admin';
  const sessionProvider = getSessionProvider(session);
  const rows = await getRowsForPeriod(periodId);
  const visibleRows = isAdmin ? rows : rows.filter(row => row.provider === sessionProvider);
  const uploadHistory = await getUploadHistory();
  const uploadedPeriodCount = await getUploadedPeriodCount();

  return {
    overviewRows: sanitizeOverviewRows(rows, sessionProvider, isAdmin),
    detailRows: isAdmin ? rows : rows.filter(row => row.provider === sessionProvider),
    allocationSummary: await getAllocationSummary(isAdmin ? null : sessionProvider),
    uploadHistory: isAdmin ? uploadHistory : [],
    uploadedPeriodCount,
    totalSubmittedOrders: visibleRows.reduce((sum, row) => sum + row.submittedOrders, 0)
  };
};

app.post('/api/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  getAccountByUsername(username)
    .then(account => {
      if (!account || !verifyPassword(password, account.passwordSalt, account.passwordHash)) {
        return res.status(401).json({ message: '账号或密码不匹配' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, {
        session: account.session,
        expiresAt: Date.now() + SESSION_TTL_MS
      });

      return res.json({ token, session: account.session });
    })
    .catch(error => res.status(500).json({ message: error.message || '登录失败' }));
});

app.get('/api/session', (req, res) => {
  const token = getToken(req);
  const session = getSessionByToken(token);
  if (!session) {
    return res.status(401).json({ message: '登录已失效' });
  }

  return res.json({ session });
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  buildDashboardPayload(req.session, String(req.query.periodId || 'ALL'))
    .then(payload => res.json(payload))
    .catch(error => res.status(500).json({ message: error.message || '数据读取失败' }));
});

app.post('/api/admin/period-rows', requireAuth, requireAdmin, (req, res) => {
  const periodId = String(req.body?.periodId || '');
  const period = WEEKLY_PERIODS.find(item => item.id === periodId);
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  if (!period) {
    return res.status(400).json({ message: '无效周期' });
  }
  if (rows.length === 0) {
    return res.status(400).json({ message: '缺少评分数据' });
  }

  savePeriodRows(period.id, rows.map(row => recalculateRow(row)))
    .then(() => buildDashboardPayload(req.session, period.id))
    .then(payload => res.json(payload))
    .catch(error => res.status(500).json({ message: error.message || '数据保存失败' }));
});

app.post('/api/admin/upload-history', requireAuth, requireAdmin, (req, res) => {
  const entry = req.body?.entry;
  const sourceRows = Array.isArray(req.body?.sourceRows) ? req.body.sourceRows : [];
  if (!entry?.id) {
    return res.status(400).json({ message: '缺少上传记录' });
  }

  saveUploadRecord(entry, sourceRows)
    .then(() => getUploadHistory())
    .then(uploadHistory => res.json({ uploadHistory }))
    .catch(error => res.status(500).json({ message: error.message || '上传历史保存失败' }));
});

app.post('/api/admin/reset-period', requireAuth, requireAdmin, (req, res) => {
  const periodId = String(req.body?.periodId || '');
  const period = WEEKLY_PERIODS.find(item => item.id === periodId);
  if (!period) {
    return res.status(400).json({ message: '无效周期' });
  }

  resetPeriodRows(period)
    .then(() => buildDashboardPayload(req.session, period.id))
    .then(payload => res.json(payload))
    .catch(error => res.status(500).json({ message: error.message || '周期数据重置失败' }));
});

app.post('/api/logout', (req, res) => {
  const token = getToken(req);
  if (token) sessions.delete(token);
  return res.status(204).end();
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

await initDatabase(DUCKDB_PATH, accounts);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fulfillment score dashboard listening on ${PORT}`);
  console.log(`DuckDB database: ${DUCKDB_PATH}`);
});

const { query } = require('../config/database');
const { sendEmail, emailTemplates } = require('../utils/email');

// GET /api/admin/dashboard — Statistiques globales
const getDashboard = async (req, res, next) => {
  try {
    const [companies, users, pending, recentCompanies] = await Promise.all([
      query('SELECT COUNT(*) FROM companies'),
      query('SELECT COUNT(*) FROM users WHERE role != $1', ['super_admin']),
      query("SELECT COUNT(*) FROM companies WHERE status = 'pending'"),
      query(`
        SELECT id, name, email, status, business_type, created_at
        FROM companies
        ORDER BY created_at DESC
        LIMIT 5
      `),
    ]);

    const byStatus = await query(
      `SELECT status, COUNT(*) as count FROM companies GROUP BY status`
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalCompanies: parseInt(companies.rows[0].count),
          totalUsers: parseInt(users.rows[0].count),
          pendingApprovals: parseInt(pending.rows[0].count),
        },
        companiesByStatus: byStatus.rows.reduce((acc, r) => {
          acc[r.status] = parseInt(r.count);
          return acc;
        }, {}),
        recentCompanies: recentCompanies.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/companies — Liste toutes les entreprises
const getCompanies = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [companiesResult, countResult] = await Promise.all([
      query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS user_count
         FROM companies c
         ${where}
         ORDER BY c.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM companies c ${where}`, params),
    ]);

    res.json({
      success: true,
      data: {
        companies: companiesResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/companies/:id
const getCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*,
              json_agg(json_build_object(
                'id', u.id, 'firstName', u.first_name, 'lastName', u.last_name,
                'email', u.email, 'role', u.role, 'isActive', u.is_active,
                'createdAt', u.created_at
              )) FILTER (WHERE u.id IS NOT NULL) AS users
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Entreprise introuvable' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/companies/:id/approve
const approveCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE companies SET status = 'active', validated_at = NOW(), rejection_reason = NULL
       WHERE id = $1 AND status = 'pending'
       RETURNING name, email`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée ou déjà traitée' });
    }

    const { name, email } = result.rows[0];
    const tpl = emailTemplates.accountApproved(name);
    await sendEmail({ to: email, ...tpl });

    await logAudit(req.user.id, null, 'COMPANY_APPROVED', 'company', id);

    res.json({ success: true, message: `Entreprise "${name}" approuvée avec succès` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/companies/:id/reject
const rejectCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Fix #8 — raison obligatoire pour tracer le refus
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Une raison de refus est obligatoire' });
    }

    const result = await query(
      `UPDATE companies SET status = 'rejected', rejection_reason = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING name, email`,
      [id, reason]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée ou déjà traitée' });
    }

    const { name, email } = result.rows[0];
    const tpl = emailTemplates.accountRejected(name, reason);
    await sendEmail({ to: email, ...tpl });

    await logAudit(req.user.id, null, 'COMPANY_REJECTED', 'company', id);

    res.json({ success: true, message: `Entreprise "${name}" refusée` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/companies/:id/suspend
const suspendCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE companies SET status = 'suspended' WHERE id = $1 RETURNING name, email`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Entreprise introuvable' });
    }
    const { name, email } = result.rows[0];
    const tpl = emailTemplates.accountSuspended(name);
    await sendEmail({ to: email, ...tpl });
    await logAudit(req.user.id, null, 'COMPANY_SUSPENDED', 'company', id);
    res.json({ success: true, message: `Entreprise "${name}" suspendue` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/companies/:id/reactivate
const reactivateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE companies SET status = 'active' WHERE id = $1 RETURNING name, email`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Entreprise introuvable' });
    }
    const { name, email } = result.rows[0];
    const tpl = emailTemplates.accountReactivated(name);
    await sendEmail({ to: email, ...tpl });
    await logAudit(req.user.id, null, 'COMPANY_REACTIVATED', 'company', id);
    res.json({ success: true, message: `Entreprise "${name}" réactivée` });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = "WHERE u.role != 'super_admin'";
    const params = [];

    if (search) {
      where += ` AND (u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1)`;
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active,
              u.last_login_at, u.created_at, c.name AS company_name, c.id AS company_id
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    const count = await query(
      `SELECT COUNT(*) FROM users u ${where}`,
      params
    );

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          total: parseInt(count.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT al.*, u.first_name || ' ' || u.last_name AS user_name, c.name AS company_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       LEFT JOIN companies c ON al.company_id = c.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

async function logAudit(userId, companyId, action, entityType, entityId) {
  try {
    await query(
      'INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
      [userId, companyId, action, entityType, entityId]
    );
  } catch (err) {
    // Fix #10 — ne pas avaler silencieusement les échecs d'audit
    console.error('[audit] Échec enregistrement log:', err.message);
  }
}

module.exports = {
  getDashboard, getCompanies, getCompany,
  approveCompany, rejectCompany, suspendCompany, reactivateCompany,
  getUsers, getAuditLogs,
};

const express = require('express');
const router = express.Router();
const { authenticate, isSuperAdmin } = require('../middleware/auth');
const {
  getDashboard, getCompanies, getCompany,
  approveCompany, rejectCompany, suspendCompany, reactivateCompany,
  getUsers, getAuditLogs,
} = require('../controllers/adminController');

router.use(authenticate, isSuperAdmin);

router.get('/dashboard', getDashboard);
router.get('/companies', getCompanies);
router.get('/companies/:id', getCompany);
router.patch('/companies/:id/approve', approveCompany);
router.patch('/companies/:id/reject', rejectCompany);
router.patch('/companies/:id/suspend', suspendCompany);
router.patch('/companies/:id/reactivate', reactivateCompany);
router.get('/users', getUsers);
router.get('/audit-logs', getAuditLogs);

module.exports = router;

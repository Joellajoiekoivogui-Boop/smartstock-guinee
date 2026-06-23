const { query } = require('../config/database');

// GET /api/categories
const getCategories = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const result = await query(
      `SELECT c.*, COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
       WHERE c.company_id = $1
       GROUP BY c.id
       ORDER BY c.name`,
      [companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { name, description, color } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est requis' });
    }

    const result = await query(
      `INSERT INTO categories (company_id, name, description, color)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [companyId, name.trim(), description || null, color || '#16a34a']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const { name, description, color } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est requis' });
    }

    const result = await query(
      `UPDATE categories
       SET name=$1, description=$2, color=$3, updated_at=NOW()
       WHERE id=$4 AND company_id=$5
       RETURNING *`,
      [name.trim(), description || null, color || '#16a34a', id, companyId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM categories WHERE id=$1 AND company_id=$2 RETURNING name`,
      [id, companyId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Catégorie introuvable' });
    }
    res.json({ success: true, message: `Catégorie "${result.rows[0].name}" supprimée` });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };

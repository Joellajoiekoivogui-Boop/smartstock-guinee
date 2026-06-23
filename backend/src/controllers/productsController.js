const { query } = require('../config/database');

// GET /api/products?search=&category_id=&page=&limit=&active_only=true
const getProducts = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { search, category_id, page = 1, limit = 50, active_only } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['p.company_id = $1'];
    const params = [companyId];
    let idx = 2;

    if (active_only === 'true') {
      conditions.push('p.is_active = true');
    }
    if (category_id) {
      conditions.push(`p.category_id = $${idx++}`);
      params.push(category_id);
    }
    if (search) {
      conditions.push(`(p.name ILIKE $${idx} OR p.barcode ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [productsResult, countResult] = await Promise.all([
      query(
        `SELECT p.*, cat.name AS category_name, cat.color AS category_color
         FROM products p
         LEFT JOIN categories cat ON cat.id = p.category_id
         ${where}
         ORDER BY p.name
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM products p ${where}`, params),
    ]);

    res.json({
      success: true,
      data: {
        products: productsResult.rows,
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

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { name, description, price, stock, barcode, unit, category_id } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom du produit est requis' });
    }
    if (price === undefined || parseFloat(price) < 0) {
      return res.status(400).json({ success: false, message: 'Le prix est invalide' });
    }

    const result = await query(
      `INSERT INTO products (company_id, category_id, name, description, price, stock, barcode, unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [companyId, category_id || null, name.trim(), description || null,
       parseFloat(price), parseInt(stock) || 0, barcode || null, unit || 'unité']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;
    const { name, description, price, stock, barcode, unit, category_id, is_active } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Le nom du produit est requis' });
    }

    const result = await query(
      `UPDATE products
       SET name=$1, description=$2, price=$3, stock=$4, barcode=$5,
           unit=$6, category_id=$7, is_active=$8, updated_at=NOW()
       WHERE id=$9 AND company_id=$10
       RETURNING *`,
      [name.trim(), description || null, parseFloat(price), parseInt(stock) || 0,
       barcode || null, unit || 'unité', category_id || null,
       is_active !== false, id, companyId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id — désactivation douce (soft delete)
const deleteProduct = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    const result = await query(
      `UPDATE products SET is_active=false, updated_at=NOW()
       WHERE id=$1 AND company_id=$2 RETURNING name`,
      [id, companyId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Produit introuvable' });
    }
    res.json({ success: true, message: `Produit "${result.rows[0].name}" désactivé` });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };

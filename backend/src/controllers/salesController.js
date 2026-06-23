const { query, getClient } = require('../config/database');

// GET /api/sales
const getSales = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [salesResult, countResult] = await Promise.all([
      query(
        `SELECT s.id, s.total, s.discount, s.payment_method, s.note, s.created_at,
                u.first_name || ' ' || u.last_name AS seller_name
         FROM sales s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE s.company_id = $1
         ORDER BY s.created_at DESC
         LIMIT $2 OFFSET $3`,
        [companyId, parseInt(limit), offset]
      ),
      query('SELECT COUNT(*) FROM sales WHERE company_id=$1', [companyId]),
    ]);

    res.json({
      success: true,
      data: {
        sales: salesResult.rows,
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

// GET /api/sales/:id
const getSale = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { id } = req.params;

    const [saleResult, itemsResult] = await Promise.all([
      query(
        `SELECT s.*, u.first_name || ' ' || u.last_name AS seller_name
         FROM sales s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE s.id=$1 AND s.company_id=$2`,
        [id, companyId]
      ),
      query(
        `SELECT si.* FROM sale_items si
         JOIN sales s ON si.sale_id = s.id
         WHERE si.sale_id=$1 AND s.company_id=$2`,
        [id, companyId]
      ),
    ]);

    if (!saleResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Vente introuvable' });
    }

    res.json({ success: true, data: { ...saleResult.rows[0], items: itemsResult.rows } });
  } catch (err) {
    next(err);
  }
};

// POST /api/sales
const createSale = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { items, payment_method = 'cash', discount = 0, note } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'La vente doit contenir au moins un article' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      let subtotalTotal = 0;
      const validatedItems = [];

      for (const item of items) {
        if (!item.product_id || !item.quantity || parseInt(item.quantity) < 1) {
          throw Object.assign(new Error('Article invalide dans le panier'), { client: true });
        }

        const productResult = await client.query(
          `SELECT id, name, price, stock FROM products
           WHERE id=$1 AND company_id=$2 AND is_active=true`,
          [item.product_id, companyId]
        );

        if (!productResult.rows.length) {
          throw Object.assign(new Error(`Produit introuvable`), { client: true });
        }

        const product = productResult.rows[0];
        const qty = parseInt(item.quantity);

        if (product.stock < qty) {
          throw Object.assign(
            new Error(`Stock insuffisant pour "${product.name}" : ${product.stock} disponible(s)`),
            { client: true }
          );
        }

        const unitPrice = item.unit_price !== undefined ? parseFloat(item.unit_price) : parseFloat(product.price);
        const subtotal = unitPrice * qty;
        subtotalTotal += subtotal;
        validatedItems.push({ id: product.id, name: product.name, qty, unitPrice, subtotal });
      }

      const discountAmount = parseFloat(discount) || 0;
      const total = subtotalTotal - discountAmount;

      const saleResult = await client.query(
        `INSERT INTO sales (company_id, user_id, total, discount, payment_method, note)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [companyId, userId, total, discountAmount, payment_method, note || null]
      );
      const saleId = saleResult.rows[0].id;

      for (const item of validatedItems) {
        await client.query(
          `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [saleId, item.id, item.name, item.qty, item.unitPrice, item.subtotal]
        );
        await client.query(
          'UPDATE products SET stock = stock - $1, updated_at=NOW() WHERE id=$2',
          [item.qty, item.id]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: { id: saleId, total } });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.client) {
        return res.status(400).json({ success: false, message: err.message });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { getSales, getSale, createSale };

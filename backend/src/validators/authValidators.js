const { body } = require('express-validator');

const registerValidator = [
  body('companyName').trim().notEmpty().withMessage('Nom de l\'entreprise requis').isLength({ min: 2, max: 200 }),
  body('ownerFirstName').trim().notEmpty().withMessage('Prénom requis'),
  body('ownerLastName').trim().notEmpty().withMessage('Nom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 8 }).withMessage('Mot de passe minimum 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir majuscule, minuscule et chiffre'),
  body('phone').optional().isMobilePhone().withMessage('Numéro de téléphone invalide'),
];

const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

module.exports = { registerValidator, loginValidator };

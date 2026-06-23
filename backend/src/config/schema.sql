-- =============================================================
-- SMARTSTOCK GUINÉE — Schéma PostgreSQL complet
-- Compatible : multi-commerces (pharmacie, habits, chicha,
--              magasin général, dépôt boissons, bar/restaurant)
-- =============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 1. MULTI-TENANT — ENTREPRISES
-- =============================================================
CREATE TYPE company_status AS ENUM ('pending','active','suspended','rejected');

CREATE TABLE IF NOT EXISTS companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom         VARCHAR(200)  NOT NULL,
    email       VARCHAR(150)  UNIQUE NOT NULL,
    telephone   VARCHAR(20),
    adresse     TEXT,
    ville       VARCHAR(100),
    type_commerce VARCHAR(100),        -- bar, pharmacie, habits, magasin...
    code_marchand VARCHAR(20) UNIQUE,
    logo        TEXT,
    statut      company_status DEFAULT 'pending',
    plan        VARCHAR(50) DEFAULT 'free',  -- free, starter, pro
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 2. UTILISATEURS
-- =============================================================
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'company_owner',
    'manager',
    'caissier',
    'gestionnaire',
    'employee',
    'viewer'
);

CREATE TABLE IF NOT EXISTS utilisateurs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    nom             VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe    TEXT NOT NULL,
    role            user_role DEFAULT 'caissier',
    telephone       VARCHAR(20),
    statut          BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 3. FOURNISSEURS
-- =============================================================
CREATE TABLE IF NOT EXISTS fournisseurs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
    nom         VARCHAR(150) NOT NULL,
    entreprise  VARCHAR(150),
    telephone   VARCHAR(20),
    email       VARCHAR(150),
    adresse     TEXT,
    pays        VARCHAR(100) DEFAULT 'Guinée',
    statut      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 4. CLIENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    nom             VARCHAR(150) NOT NULL,
    telephone       VARCHAR(20),
    email           VARCHAR(150),
    adresse         TEXT,
    type_client     VARCHAR(100) DEFAULT 'particulier',  -- particulier, entreprise, fidele
    total_achats    DECIMAL(15,2) DEFAULT 0,
    nb_achats       INT DEFAULT 0,
    solde_credit    DECIMAL(15,2) DEFAULT 0,            -- montant dû
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 5. CATÉGORIES
-- =============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
    nom         VARCHAR(100) NOT NULL,
    description TEXT,
    couleur     VARCHAR(20),                            -- pour l'affichage UI
    icone       VARCHAR(50),
    ordre       INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 6. PRODUITS
-- =============================================================
CREATE TABLE IF NOT EXISTS produits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    categorie_id    UUID REFERENCES categories(id),
    fournisseur_id  UUID REFERENCES fournisseurs(id),

    nom             VARCHAR(200) NOT NULL,
    code_barre      VARCHAR(100) UNIQUE,
    reference       VARCHAR(100),
    description     TEXT,

    prix_achat      DECIMAL(15,2) DEFAULT 0,
    prix_vente      DECIMAL(15,2) NOT NULL,
    prix_gros       DECIMAL(15,2),                     -- prix grossiste

    quantite_stock  INT DEFAULT 0,
    stock_alerte    INT DEFAULT 5,                     -- seuil d'alerte
    stock_max       INT,

    unite           VARCHAR(50) DEFAULT 'unité',       -- unité, casier, boite, kg...

    image           TEXT,
    statut          BOOLEAN DEFAULT TRUE,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 7. VENTES
-- =============================================================
CREATE TYPE statut_vente AS ENUM ('payee','partielle','impayee','annulee');
CREATE TYPE mode_paiement AS ENUM ('cash','orange_money','wave','virement','credit');

CREATE TABLE IF NOT EXISTS ventes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id           UUID REFERENCES clients(id),
    utilisateur_id      UUID REFERENCES utilisateurs(id),

    reference_vente     VARCHAR(50) UNIQUE,             -- V01001, V01002...

    montant_total       DECIMAL(15,2) NOT NULL,
    remise              DECIMAL(15,2) DEFAULT 0,
    montant_net         DECIMAL(15,2) NOT NULL,
    montant_paye        DECIMAL(15,2) DEFAULT 0,
    reste_du            DECIMAL(15,2) DEFAULT 0,

    mode_paiement       mode_paiement DEFAULT 'cash',
    statut              statut_vente DEFAULT 'payee',

    notes               TEXT,
    avoir_id            UUID,                           -- référence avoir si annulée

    date_vente          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS details_vente (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vente_id        UUID REFERENCES ventes(id) ON DELETE CASCADE,
    produit_id      UUID REFERENCES produits(id),

    quantite        INT NOT NULL,
    prix_unitaire   DECIMAL(15,2) NOT NULL,
    prix_achat      DECIMAL(15,2) DEFAULT 0,           -- snapshot prix achat au moment vente
    remise_ligne    DECIMAL(15,2) DEFAULT 0,
    sous_total      DECIMAL(15,2) NOT NULL,
    benefice_ligne  DECIMAL(15,2) DEFAULT 0            -- (prix_vente - prix_achat) × qté
);

-- =============================================================
-- 8. ACHATS (APPROVISIONNEMENTS)
-- =============================================================
CREATE TABLE IF NOT EXISTS achats (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    fournisseur_id  UUID REFERENCES fournisseurs(id),
    utilisateur_id  UUID REFERENCES utilisateurs(id),

    reference_achat VARCHAR(50),
    montant_total   DECIMAL(15,2) NOT NULL,
    statut          VARCHAR(50) DEFAULT 'recu',        -- commande, en_transit, recu

    notes           TEXT,
    date_achat      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS details_achat (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achat_id        UUID REFERENCES achats(id) ON DELETE CASCADE,
    produit_id      UUID REFERENCES produits(id),

    quantite        INT NOT NULL,
    prix_achat_unit DECIMAL(15,2) NOT NULL,
    sous_total      DECIMAL(15,2) NOT NULL
);

-- =============================================================
-- 9. MOUVEMENTS DE STOCK
-- =============================================================
CREATE TYPE type_mouvement AS ENUM ('entree','sortie','ajustement','retour','perte');

CREATE TABLE IF NOT EXISTS stock_mouvements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    produit_id      UUID REFERENCES produits(id),
    utilisateur_id  UUID REFERENCES utilisateurs(id),

    type_mouvement  type_mouvement NOT NULL,
    quantite        INT NOT NULL,
    quantite_avant  INT NOT NULL,
    quantite_apres  INT NOT NULL,

    raison          VARCHAR(255),
    reference_id    UUID,                              -- vente_id ou achat_id source

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 10. DÉPENSES
-- =============================================================
CREATE TABLE IF NOT EXISTS depenses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    utilisateur_id  UUID REFERENCES utilisateurs(id),

    titre           VARCHAR(200) NOT NULL,
    categorie       VARCHAR(100),                      -- salaire, loyer, electricite, eau...
    montant         DECIMAL(15,2) NOT NULL,
    description     TEXT,

    date_depense    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 11. PROFITS / BÉNÉFICES
-- =============================================================
CREATE TABLE IF NOT EXISTS profits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    vente_id        UUID REFERENCES ventes(id),

    chiffre_affaires    DECIMAL(15,2) NOT NULL,
    cout_marchandises   DECIMAL(15,2) NOT NULL,
    benefice_brut       DECIMAL(15,2) NOT NULL,        -- CA - Coût

    date_profit     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 12. CAISSES (GESTION DE CAISSE)
-- =============================================================
CREATE TABLE IF NOT EXISTS sessions_caisse (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    utilisateur_id  UUID REFERENCES utilisateurs(id),

    fond_ouverture  DECIMAL(15,2) DEFAULT 0,
    fond_fermeture  DECIMAL(15,2),
    total_cash      DECIMAL(15,2) DEFAULT 0,
    total_mobile    DECIMAL(15,2) DEFAULT 0,
    total_ventes    DECIMAL(15,2) DEFAULT 0,

    statut          VARCHAR(20) DEFAULT 'ouverte',     -- ouverte, fermee
    ouvert_le       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ferme_le        TIMESTAMP
);

-- =============================================================
-- 13. DETTES CLIENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS dettes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES clients(id),
    vente_id        UUID REFERENCES ventes(id),

    montant_initial DECIMAL(15,2) NOT NULL,
    montant_restant DECIMAL(15,2) NOT NULL,
    statut          VARCHAR(20) DEFAULT 'en_cours',    -- en_cours, solde, annulee

    echeance        DATE,
    notes           TEXT,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paiements_dette (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dette_id    UUID REFERENCES dettes(id),
    montant     DECIMAL(15,2) NOT NULL,
    mode        mode_paiement DEFAULT 'cash',
    paye_le     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 14. PHARMACIE — Tables spécifiques
-- =============================================================
CREATE TABLE IF NOT EXISTS medicaments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id      UUID REFERENCES produits(id) ON DELETE CASCADE,

    numero_lot      VARCHAR(100),
    date_fabrication DATE,
    date_expiration  DATE,

    dosage          VARCHAR(100),
    forme           VARCHAR(100),                      -- comprimé, sirop, pommade...
    laboratoire     VARCHAR(150),

    ordonnance_requise BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ordonnances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id),
    client_id       UUID REFERENCES clients(id),

    nom_medecin     VARCHAR(150),
    hopital         VARCHAR(150),
    image_ordonnance TEXT,
    date_ordonnance DATE,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 15. BOUTIQUE HABITS & PARFUMS — Tables spécifiques
-- =============================================================
CREATE TABLE IF NOT EXISTS tailles (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom     VARCHAR(20) NOT NULL                       -- XS, S, M, L, XL, XXL, 36, 38...
);

CREATE TABLE IF NOT EXISTS couleurs (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom     VARCHAR(50) NOT NULL,
    hex     VARCHAR(10)                                -- code couleur #RRGGBB
);

CREATE TABLE IF NOT EXISTS variantes_habits (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id  UUID REFERENCES produits(id) ON DELETE CASCADE,
    taille_id   UUID REFERENCES tailles(id),
    couleur_id  UUID REFERENCES couleurs(id),
    quantite    INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS parfums (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id  UUID REFERENCES produits(id) ON DELETE CASCADE,
    marque      VARCHAR(100),
    genre       VARCHAR(20) CHECK (genre IN ('homme','femme','mixte')),
    volume_ml   INT,
    concentration VARCHAR(50)                         -- EDT, EDP, parfum...
);

-- =============================================================
-- 16. DÉPÔT BOISSONS — Tables spécifiques
-- =============================================================
CREATE TABLE IF NOT EXISTS boissons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id      UUID REFERENCES produits(id) ON DELETE CASCADE,

    marque          VARCHAR(100),
    volume          VARCHAR(50),
    type_boisson    VARCHAR(50) CHECK (type_boisson IN (
                        'eau','jus','gazeuse','energetique','alcoolisee','lait')),
    date_expiration DATE,
    degre_alcool    DECIMAL(4,1)
);

CREATE TABLE IF NOT EXISTS casiers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id          UUID REFERENCES produits(id) ON DELETE CASCADE,
    nombre_bouteilles   INT NOT NULL,                  -- bouteilles par casier
    quantite_casiers    INT DEFAULT 0
);

-- =============================================================
-- 17. CHICHA — Tables spécifiques
-- =============================================================
CREATE TABLE IF NOT EXISTS produits_chicha (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id  UUID REFERENCES produits(id) ON DELETE CASCADE,
    marque      VARCHAR(100),
    saveur      VARCHAR(100),
    poids       VARCHAR(50),
    type_chicha VARCHAR(100)                           -- pipe, machine, arome, charbon...
);

-- =============================================================
-- 18. NOTIFICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES utilisateurs(id),

    type        VARCHAR(50),                           -- stock_faible, dette, expiration...
    titre       VARCHAR(200),
    message     TEXT,
    lu          BOOLEAN DEFAULT FALSE,
    lien        VARCHAR(200),

    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 19. RAPPORTS JOURNALIERS
-- =============================================================
CREATE TABLE IF NOT EXISTS rapports_journaliers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID REFERENCES companies(id),
    date_rapport        DATE NOT NULL,
    gerant              VARCHAR(100),

    total_ventes        DECIMAL(15,2) DEFAULT 0,
    total_achats        DECIMAL(15,2) DEFAULT 0,
    total_depenses      DECIMAL(15,2) DEFAULT 0,
    benefice_net        DECIMAL(15,2) DEFAULT 0,

    somme_presente      DECIMAL(15,2) DEFAULT 0,
    orange_money        DECIMAL(15,2) DEFAULT 0,
    manquant            DECIMAL(15,2) DEFAULT 0,
    dettes_du_jour      DECIMAL(15,2) DEFAULT 0,

    data_json           JSONB,                         -- snapshot complet de la journée

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, date_rapport)
);

-- =============================================================
-- 20. JOURNAL D'AUDIT
-- =============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id),
    user_id     UUID REFERENCES utilisateurs(id),

    action      VARCHAR(100) NOT NULL,
    table_cible VARCHAR(100),
    enregistrement_id UUID,
    details     JSONB,

    ip          VARCHAR(45),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- 21. TOKENS (AUTH)
-- =============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- INDEX PERFORMANCE
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_produits_company      ON produits(company_id);
CREATE INDEX IF NOT EXISTS idx_produits_categorie    ON produits(categorie_id);
CREATE INDEX IF NOT EXISTS idx_ventes_company        ON ventes(company_id);
CREATE INDEX IF NOT EXISTS idx_ventes_client         ON ventes(client_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date           ON ventes(date_vente);
CREATE INDEX IF NOT EXISTS idx_details_vente_vente   ON details_vente(vente_id);
CREATE INDEX IF NOT EXISTS idx_clients_company       ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_telephone     ON clients(telephone);
CREATE INDEX IF NOT EXISTS idx_achats_company        ON achats(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_mv_produit      ON stock_mouvements(produit_id);
CREATE INDEX IF NOT EXISTS idx_audit_company         ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_notif_user            ON notifications(user_id, lu);

-- =============================================================
-- TRIGGER : updated_at automatique
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_upd     BEFORE UPDATE ON companies     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_utilisateurs_upd  BEFORE UPDATE ON utilisateurs  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_produits_upd      BEFORE UPDATE ON produits      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- TRIGGER : Déduction/ajout stock auto sur vente
-- =============================================================
CREATE OR REPLACE FUNCTION after_detail_vente_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE produits
  SET quantite_stock = quantite_stock - NEW.quantite
  WHERE id = NEW.produit_id;

  INSERT INTO stock_mouvements(company_id, produit_id, type_mouvement, quantite,
      quantite_avant, quantite_apres, raison, reference_id)
  SELECT
      v.company_id, NEW.produit_id, 'sortie', NEW.quantite,
      p.quantite_stock + NEW.quantite, p.quantite_stock,
      'Vente ' || v.reference_vente, v.id
  FROM ventes v, produits p
  WHERE v.id = NEW.vente_id AND p.id = NEW.produit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_vente
  AFTER INSERT ON details_vente
  FOR EACH ROW EXECUTE FUNCTION after_detail_vente_insert();

-- =============================================================
-- TRIGGER : Ajout stock auto sur achat
-- =============================================================
CREATE OR REPLACE FUNCTION after_detail_achat_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE produits
  SET quantite_stock = quantite_stock + NEW.quantite,
      prix_achat = NEW.prix_achat_unit
  WHERE id = NEW.produit_id;

  INSERT INTO stock_mouvements(company_id, produit_id, type_mouvement, quantite,
      quantite_avant, quantite_apres, raison, reference_id)
  SELECT
      a.company_id, NEW.produit_id, 'entree', NEW.quantite,
      p.quantite_stock - NEW.quantite, p.quantite_stock,
      'Achat ' || a.reference_achat, a.id
  FROM achats a, produits p
  WHERE a.id = NEW.achat_id AND p.id = NEW.produit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_achat
  AFTER INSERT ON details_achat
  FOR EACH ROW EXECUTE FUNCTION after_detail_achat_insert();

-- =============================================================
-- TRIGGER : Calcul profit auto sur vente validée
-- =============================================================
CREATE OR REPLACE FUNCTION after_vente_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_cout DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(prix_achat * quantite), 0)
  INTO v_cout
  FROM details_vente
  WHERE vente_id = NEW.id;

  INSERT INTO profits(company_id, vente_id, chiffre_affaires, cout_marchandises, benefice_brut)
  VALUES (NEW.company_id, NEW.id, NEW.montant_net, v_cout, NEW.montant_net - v_cout);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profit_vente
  AFTER INSERT ON ventes
  FOR EACH ROW EXECUTE FUNCTION after_vente_insert();

-- =============================================================
-- DONNÉES INITIALES : Super Admin SmartStock
-- =============================================================
INSERT INTO utilisateurs (nom, email, mot_de_passe, role, statut)
VALUES ('Super Admin', 'admin@smartstock.gn',
        '$2a$10$XYZ...hash_bcrypt_AdminSmartStock2024!...', 'super_admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- VUE : Résumé stock par produit
-- =============================================================
CREATE OR REPLACE VIEW v_stock_alerte AS
SELECT
    p.id, p.company_id, p.nom, p.quantite_stock, p.stock_alerte,
    p.prix_vente, p.prix_achat,
    c.nom AS categorie,
    CASE
        WHEN p.quantite_stock = 0 THEN 'rupture'
        WHEN p.quantite_stock <= p.stock_alerte THEN 'critique'
        ELSE 'normal'
    END AS etat_stock
FROM produits p
LEFT JOIN categories c ON c.id = p.categorie_id
WHERE p.statut = TRUE;

-- =============================================================
-- VUE : CA et bénéfice par jour
-- =============================================================
CREATE OR REPLACE VIEW v_stats_journalieres AS
SELECT
    company_id,
    DATE(date_vente) AS jour,
    COUNT(*) AS nb_ventes,
    SUM(montant_net) AS chiffre_affaires,
    SUM(reste_du) AS total_credits
FROM ventes
WHERE statut != 'annulee'
GROUP BY company_id, DATE(date_vente);

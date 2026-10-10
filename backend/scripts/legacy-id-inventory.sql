-- ============================================================================
-- MOBLER SEARCH - PHASE 2C: LEGACY IDENTIFIER DATABASE INVENTORY SCRIPT
-- ============================================================================
-- PURPOSE:
--   Read-only extraction of distinct legacy taxonomy identifiers, categories,
--   special models, amenities, styles, and moods stored in the database.
--
-- INSTRUCTIONS FOR HUMAN OPERATOR:
--   1. Connect to your staging database or read-only production replica using
--      a read-only database user.
--   2. Run this script via psql or your database CLI:
--        psql "$DATABASE_URL" -f scripts/legacy-id-inventory.sql > legacy-ids-db.tsv
--      Or via MySQL / MariaDB:
--        mysql -h "$DB_HOST" -u "$READONLY_USER" -p "$DB_NAME" < scripts/legacy-id-inventory.sql > legacy-ids-db.tsv
--   3. Inspect the resulting TSV/CSV output. Verify it contains only identifier
--      strings and counts.
--   4. Provide the extracted TSV/CSV back to the migration team for reconciliation.
--
-- EXPECTED OUTPUT FORMAT:
--   Two columns: identifier (string) and count (integer).
--   Example:
--     identifier          | count
--     --------------------+-------
--     cat_cafe            | 42
--     Cat Café            | 18
--     quiet_reading_cafe  | 5
--     Wi-Fi               | 120
--
-- SAFETY GUARANTEES:
--   - Read-only operations only (SELECT / UNION ALL / GROUP BY).
--   - Zero data manipulation or schema modification statements.
--   - Does NOT select personal info, names, emails, credentials, or free-form text.
-- ============================================================================

WITH extracted_identifiers AS (
  -- 1. Special models from shops / places table
  SELECT unnest(special_models) AS identifier
  FROM shops
  WHERE special_models IS NOT NULL

  UNION ALL

  -- 2. Styles from shops / places table
  SELECT unnest(styles) AS identifier
  FROM shops
  WHERE styles IS NOT NULL

  UNION ALL

  -- 3. Primary style from shops / places table
  SELECT primary_style AS identifier
  FROM shops
  WHERE primary_style IS NOT NULL

  UNION ALL

  -- 4. Primary model from shops / places table
  SELECT primary_model AS identifier
  FROM shops
  WHERE primary_model IS NOT NULL

  UNION ALL

  -- 5. Amenities from shops / places table
  SELECT unnest(amenities) AS identifier
  FROM shops
  WHERE amenities IS NOT NULL

  UNION ALL

  -- 6. Moods from shops / places table
  SELECT unnest(moods) AS identifier
  FROM shops
  WHERE moods IS NOT NULL

  UNION ALL

  -- 7. Tags from shops / places table
  SELECT unnest(tags) AS identifier
  FROM shops
  WHERE tags IS NOT NULL
)
SELECT
  TRIM(identifier) AS identifier,
  COUNT(*) AS count
FROM extracted_identifiers
WHERE identifier IS NOT NULL AND TRIM(identifier) <> ''
GROUP BY TRIM(identifier)
ORDER BY count DESC, identifier ASC;

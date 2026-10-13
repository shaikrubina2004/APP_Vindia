-- =====================================================================
-- FILE: APP_Vindia/backend/migrations/operationsRolesAndDepartment.sql
-- Operations & Administration — the five official roles (department_id = 3).
-- Idempotent. Run:  npm run migrate:ops-roles
--
--  * admin_executive is RENAMED in place to office_administrator, so any user
--    already holding that role keeps it (role id is unchanged).
--  * procurement_officer / logistics_coordinator / inventory_controller are
--    inserted only if missing.
--  * Nothing is deleted. A leftover admin_executive row with no users is
--    only deactivated.
-- If your roles table has extra NOT NULL columns without defaults the INSERT
-- will fail with a clear message; add those columns to the VALUES below.
-- =====================================================================
DO $roles$
DECLARE
  dept CONSTANT INTEGER := 3;
BEGIN
  -- keep the id sequence ahead of any hand-seeded ids
  PERFORM setval(pg_get_serial_sequence('roles', 'id'),
                 GREATEST((SELECT COALESCE(MAX(id), 1) FROM roles), 1));

  IF EXISTS (SELECT 1 FROM roles WHERE code = 'admin_executive')
     AND NOT EXISTS (SELECT 1 FROM roles WHERE code = 'office_administrator') THEN
    UPDATE roles
       SET code = 'office_administrator', name = 'Office Administrator'
     WHERE code = 'admin_executive';
  END IF;

  INSERT INTO roles (name, code, department_id, is_active)
  SELECT v.name, v.code, dept, TRUE
  FROM (VALUES
    ('Operations Manager',    'operations_manager'),
    ('Office Administrator',  'office_administrator'),
    ('Procurement Officer',   'procurement_officer'),
    ('Logistics Coordinator', 'logistics_coordinator'),
    ('Inventory Controller',  'inventory_controller')
  ) AS v(name, code)
  WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.code = v.code);

  UPDATE roles
     SET department_id = dept, is_active = TRUE
   WHERE code IN ('operations_manager','office_administrator','procurement_officer',
                  'logistics_coordinator','inventory_controller');

  UPDATE roles
     SET is_active = FALSE
   WHERE code = 'admin_executive'
     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.role_id = roles.id);

  IF to_regclass('departments') IS NOT NULL THEN
    UPDATE departments
       SET name = 'Operations & Administration'
     WHERE id = dept AND name ILIKE 'operations%' AND name <> 'Operations & Administration';
  END IF;
END
$roles$;

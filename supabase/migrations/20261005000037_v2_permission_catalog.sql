BEGIN;

-- V2 Batch 2-A: Permission Catalog
-- Adds the commercial, multi-tenant permission vocabulary without removing
-- or renaming any V1 permission. Role mappings are deliberately conservative.

INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'company', 'view', 'company.view', 'View company profile and branding'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'company.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'company', 'edit', 'company.edit', 'Edit company profile'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'company.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'company', 'branding_view', 'company.branding.view', 'View company branding'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'company.branding.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'company', 'branding_manage', 'company.branding.manage', 'Manage company branding'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'company.branding.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'company', 'settings_view', 'company.settings.view', 'View company settings'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'company.settings.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'company', 'settings_manage', 'company.settings.manage', 'Manage company settings'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'company.settings.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'view', 'users.view', 'View company users'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'create', 'users.create', 'Create company users'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'edit', 'users.edit', 'Edit company users'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'activate', 'users.activate', 'Activate company users'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'deactivate', 'users.deactivate', 'Deactivate company users'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'assign_role', 'users.assign_role', 'Assign roles to users'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.assign_role');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'revoke_role', 'users.revoke_role', 'Revoke roles from users'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.revoke_role');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'assign_region', 'users.assign_region', 'Assign users to regions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.assign_region');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'users', 'remove_region', 'users.remove_region', 'Remove users from regions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'users.remove_region');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'roles', 'view', 'roles.view', 'View roles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'roles.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'roles', 'create', 'roles.create', 'Create roles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'roles.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'roles', 'edit', 'roles.edit', 'Edit roles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'roles.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'roles', 'activate', 'roles.activate', 'Activate roles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'roles.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'roles', 'deactivate', 'roles.deactivate', 'Deactivate roles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'roles.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'roles', 'assign_permission', 'roles.assign_permission', 'Assign permissions to roles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'roles.assign_permission');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'roles', 'revoke_permission', 'roles.revoke_permission', 'Revoke permissions from roles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'roles.revoke_permission');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'governance', 'view', 'governance.view', 'View governance settings'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'governance.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'governance', 'manage', 'governance.manage', 'Manage governance settings'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'governance.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'governance', 'delegate', 'governance.delegate', 'Delegate management capabilities'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'governance.delegate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'governance', 'revoke', 'governance.revoke', 'Revoke management capability delegations'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'governance.revoke');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'governance', 'ceo_view', 'governance.ceo.view', 'View CEO assignment'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'governance.ceo.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'governance', 'ceo_assign', 'governance.ceo.assign', 'Assign company CEO'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'governance.ceo.assign');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'view', 'customers.view', 'View customers within allowed scope'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'create', 'customers.create', 'Create customers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'edit', 'customers.edit', 'Edit customers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'archive', 'customers.archive', 'Archive customers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.archive');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'assign', 'customers.assign', 'Assign customer owner'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.assign');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'reassign', 'customers.reassign', 'Reassign customer ownership'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.reassign');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'change_ownership_mode', 'customers.change_ownership_mode', 'Change customer ownership mode'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.change_ownership_mode');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'customers', 'view_history', 'customers.view_history', 'View customer ownership history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'customers.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'view', 'orders.view', 'View orders within allowed scope'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'create', 'orders.create', 'Create orders'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'edit', 'orders.edit', 'Edit orders'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'submit', 'orders.submit', 'Submit orders for approval'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.submit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'regional_review', 'orders.regional_review', 'Review orders at regional stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.regional_review');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'regional_approve', 'orders.regional_approve', 'Approve orders at regional stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.regional_approve');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'regional_return', 'orders.regional_return', 'Return orders from regional stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.regional_return');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'regional_reject', 'orders.regional_reject', 'Reject orders at regional stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.regional_reject');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'sales_review', 'orders.sales_review', 'Review orders at sales stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.sales_review');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'sales_approve', 'orders.sales_approve', 'Approve orders at sales stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.sales_approve');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'sales_return', 'orders.sales_return', 'Return orders from sales stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.sales_return');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'sales_reject', 'orders.sales_reject', 'Reject orders at sales stage'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.sales_reject');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'cancel', 'orders.cancel', 'Cancel orders'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.cancel');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders', 'view_history', 'orders.view_history', 'View order history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders.items', 'edit', 'orders.items.edit', 'Edit order items'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.items.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'orders.items', 'remove', 'orders.items.remove', 'Remove order items before lock'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'orders.items.remove');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'view', 'shipments.view', 'View shipments within allowed scope'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'create', 'shipments.create', 'Create shipments'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'edit', 'shipments.edit', 'Edit shipments'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'confirm', 'shipments.confirm', 'Confirm shipment'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.confirm');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'cancel', 'shipments.cancel', 'Cancel shipments'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.cancel');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'assign_driver', 'shipments.assign_driver', 'Assign driver to shipment'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.assign_driver');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'assign_vehicle', 'shipments.assign_vehicle', 'Assign vehicle to shipment'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.assign_vehicle');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'adjust_quantity', 'shipments.adjust_quantity', 'Adjust shipment quantity within rules'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.adjust_quantity');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'shipments', 'view_history', 'shipments.view_history', 'View shipment history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'shipments.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'view', 'waybills.view', 'View waybills within allowed scope'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'create', 'waybills.create', 'Create waybills'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'edit', 'waybills.edit', 'Edit waybills within allowed state'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'issue', 'waybills.issue', 'Issue waybills'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.issue');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'cancel', 'waybills.cancel', 'Cancel waybills'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.cancel');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'reissue', 'waybills.reissue', 'Reissue waybills through controlled workflow'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.reissue');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'print', 'waybills.print', 'Print or export waybills'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.print');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'waybills', 'view_history', 'waybills.view_history', 'View waybill history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'waybills.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'view', 'loading.view', 'View loading operations'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'start', 'loading.start', 'Start loading'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.start');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'edit', 'loading.edit', 'Edit loading before confirmation'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'tonnage_edit', 'loading.tonnage_edit', 'Edit actual tonnage before confirmation'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.tonnage_edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'confirm', 'loading.confirm', 'Confirm loading'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.confirm');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'cancel', 'loading.cancel', 'Cancel loading'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.cancel');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'view_history', 'loading.view_history', 'View loading history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'loading', 'tonnage_adjust_after_confirm', 'loading.tonnage_adjust_after_confirm', 'Adjust confirmed tonnage through controlled workflow'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'loading.tonnage_adjust_after_confirm');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'delivery', 'view', 'delivery.view', 'View delivery status'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'delivery.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'delivery', 'confirm', 'delivery.confirm', 'Confirm delivery'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'delivery.confirm');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'delivery', 'edit', 'delivery.edit', 'Edit delivery information within allowed workflow'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'delivery.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'delivery', 'view_history', 'delivery.view_history', 'View delivery history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'delivery.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'delivery.proof', 'upload', 'delivery.proof.upload', 'Upload delivery proof'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'delivery.proof.upload');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'delivery.proof', 'view', 'delivery.proof.view', 'View delivery proof'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'delivery.proof.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'products', 'view', 'products.view', 'View products and catalog'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'products.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'products', 'create', 'products.create', 'Create products'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'products.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'products', 'edit', 'products.edit', 'Edit products'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'products.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'products', 'activate', 'products.activate', 'Activate products'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'products.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'products', 'deactivate', 'products.deactivate', 'Deactivate products'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'products.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'products', 'manage_catalog', 'products.manage_catalog', 'Manage product catalog presentation'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'products.manage_catalog');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'products', 'manage_pricing', 'products.manage_pricing', 'Manage product pricing'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'products.manage_pricing');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'vehicles', 'view', 'vehicles.view', 'View vehicles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'vehicles.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'vehicles', 'create', 'vehicles.create', 'Create vehicles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'vehicles.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'vehicles', 'edit', 'vehicles.edit', 'Edit vehicles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'vehicles.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'vehicles', 'activate', 'vehicles.activate', 'Activate vehicles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'vehicles.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'vehicles', 'deactivate', 'vehicles.deactivate', 'Deactivate vehicles'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'vehicles.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'drivers', 'view', 'drivers.view', 'View drivers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'drivers.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'drivers', 'create', 'drivers.create', 'Create drivers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'drivers.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'drivers', 'edit', 'drivers.edit', 'Edit drivers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'drivers.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'drivers', 'activate', 'drivers.activate', 'Activate drivers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'drivers.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'drivers', 'deactivate', 'drivers.deactivate', 'Deactivate drivers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'drivers.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'regions', 'view', 'regions.view', 'View regions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'regions.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'regions', 'create', 'regions.create', 'Create regions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'regions.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'regions', 'edit', 'regions.edit', 'Edit regions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'regions.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'regions', 'activate', 'regions.activate', 'Activate regions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'regions.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'regions', 'deactivate', 'regions.deactivate', 'Deactivate regions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'regions.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'regions', 'reassign', 'regions.reassign', 'Reassign regions between managers'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'regions.reassign');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'regions', 'view_history', 'regions.view_history', 'View region assignment history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'regions.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'plan_areas', 'view', 'plan_areas.view', 'View plan areas'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'plan_areas.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'plan_areas', 'create', 'plan_areas.create', 'Create plan areas'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'plan_areas.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'plan_areas', 'edit', 'plan_areas.edit', 'Edit plan areas'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'plan_areas.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'plan_areas', 'activate', 'plan_areas.activate', 'Activate plan areas'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'plan_areas.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'plan_areas', 'deactivate', 'plan_areas.deactivate', 'Deactivate plan areas'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'plan_areas.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'plan_areas', 'assign_manager', 'plan_areas.assign_manager', 'Assign manager to plan area'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'plan_areas.assign_manager');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'plan_areas', 'view_history', 'plan_areas.view_history', 'View plan area assignment history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'plan_areas.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sales_portfolios', 'view', 'sales_portfolios.view', 'View sales portfolios'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sales_portfolios.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sales_portfolios', 'create', 'sales_portfolios.create', 'Create sales portfolios'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sales_portfolios.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sales_portfolios', 'edit', 'sales_portfolios.edit', 'Edit sales portfolios'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sales_portfolios.edit');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sales_portfolios', 'activate', 'sales_portfolios.activate', 'Activate sales portfolios'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sales_portfolios.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sales_portfolios', 'deactivate', 'sales_portfolios.deactivate', 'Deactivate sales portfolios'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sales_portfolios.deactivate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sales_portfolios', 'assign_manager', 'sales_portfolios.assign_manager', 'Assign portfolio manager'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sales_portfolios.assign_manager');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sales_portfolios', 'view_history', 'sales_portfolios.view_history', 'View portfolio assignment history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sales_portfolios.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'targets', 'view', 'targets.view', 'View sales targets'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'targets.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'targets', 'manage', 'targets.manage', 'Create and edit sales targets'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'targets.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'targets', 'remove', 'targets.remove', 'Remove sales targets through controlled workflow'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'targets.remove');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'targets', 'view_history', 'targets.view_history', 'View target history'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'targets.view_history');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'sales_view', 'reports.sales.view', 'View sales performance reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.sales.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'regional_view', 'reports.regional.view', 'View regional performance reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.regional.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'portfolio_view', 'reports.portfolio.view', 'View portfolio performance reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.portfolio.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'customer_view', 'reports.customer.view', 'View customer performance reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.customer.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'fulfillment_view', 'reports.fulfillment.view', 'View fulfillment reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.fulfillment.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'operational_view', 'reports.operational.view', 'View operational reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.operational.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'company_view', 'reports.company.view', 'View company-wide reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.company.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'reports', 'audit_view', 'reports.audit.view', 'View audit reports'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'reports.audit.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'notifications', 'view', 'notifications.view', 'View notifications'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'notifications.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'notifications', 'manage', 'notifications.manage', 'Manage notification templates and routing'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'notifications.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'notifications', 'send', 'notifications.send', 'Send managed notifications'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'notifications.send');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'notifications', 'preferences_manage', 'notifications.preferences.manage', 'Manage notification preferences'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'notifications.preferences.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'notifications', 'push_manage', 'notifications.push.manage', 'Manage push notification delivery'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'notifications.push.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'audit', 'view', 'audit.view', 'View audit trail'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'audit.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'audit', 'export', 'audit.export', 'Export audit records'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'audit.export');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sync', 'view', 'sync.view', 'View synchronization status'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sync.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sync', 'retry', 'sync.retry', 'Retry failed synchronization jobs'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sync.retry');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sync', 'resolve_conflict', 'sync.resolve_conflict', 'Resolve synchronization conflicts'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sync.resolve_conflict');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'sync', 'manage', 'sync.manage', 'Manage synchronization settings and queues'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'sync.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'tenants_view', 'platform.tenants.view', 'View platform tenants'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.tenants.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'tenants_create', 'platform.tenants.create', 'Create platform tenants'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.tenants.create');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'tenants_activate', 'platform.tenants.activate', 'Activate platform tenants'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.tenants.activate');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'tenants_suspend', 'platform.tenants.suspend', 'Suspend platform tenants'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.tenants.suspend');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'subscription_view', 'platform.subscription.view', 'View subscription information'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.subscription.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'subscription_manage', 'platform.subscription.manage', 'Manage subscriptions'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.subscription.manage');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'health_view', 'platform.health.view', 'View platform health'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.health.view');
INSERT INTO public.permissions (resource, action, slug, description)
SELECT 'platform', 'audit_view', 'platform.audit.view', 'View platform audit'
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE slug = 'platform.audit.view');
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.branding.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.branding.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.settings.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.settings.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.assign_role' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.revoke_role' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.assign_region' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.remove_region' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'roles.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'roles.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'roles.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'roles.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'roles.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'roles.assign_permission' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'roles.revoke_permission' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'governance.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'governance.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'governance.delegate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'governance.revoke' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'governance.ceo.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'governance.ceo.assign' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.archive' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.assign' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.reassign' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.change_ownership_mode' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.submit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_review' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_approve' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_return' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_reject' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_review' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_approve' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_return' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_reject' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.cancel' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.items.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.items.remove' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.confirm' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.cancel' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.assign_driver' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.assign_vehicle' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.adjust_quantity' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.issue' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.cancel' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.reissue' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.print' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.start' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.tonnage_edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.confirm' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.cancel' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.tonnage_adjust_after_confirm' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.confirm' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.proof.upload' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.proof.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.manage_catalog' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.manage_pricing' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'vehicles.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'vehicles.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'vehicles.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'vehicles.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'vehicles.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'drivers.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'drivers.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'drivers.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'drivers.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'drivers.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.reassign' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.assign_manager' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.create' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.activate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.deactivate' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.assign_manager' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'targets.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'targets.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'targets.remove' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'targets.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.sales.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.regional.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.portfolio.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.customer.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.fulfillment.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.operational.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.company.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.audit.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.send' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.preferences.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.push.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'audit.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'audit.export' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sync.view' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sync.retry' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sync.resolve_conflict' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sync.manage' AND p.deleted_at IS NULL
WHERE r.slug = 'company_admin' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.branding.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.settings.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'users.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.create' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.create' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.submit' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_review' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_approve' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_return' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.sales_reject' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'vehicles.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'drivers.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'sales_portfolios.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'targets.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.sales.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.regional.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.portfolio.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.customer.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.fulfillment.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.operational.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'audit.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'ai.read' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'settings.read' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.branding.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.settings.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.create' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.create' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.submit' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_review' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_approve' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_return' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.regional_reject' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'regions.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'plan_areas.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'targets.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.regional.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.customer.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.fulfillment.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'audit.view' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'ai.read' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'settings.read' AND p.deleted_at IS NULL
WHERE r.slug = 'regional_manager' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.branding.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'company.settings.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.create' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'customers.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.create' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.edit' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.submit' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'orders.view_history' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'shipments.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'waybills.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'loading.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'delivery.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'products.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'targets.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'reports.customer.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'notifications.view' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'ai.read' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.slug = 'settings.read' AND p.deleted_at IS NULL
WHERE r.slug = 'sales_rep' AND r.deleted_at IS NULL AND r.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL);

-- Compatibility: old approval slugs remain untouched; current V2 approval RPCs keep using them.
-- Compatibility: admin.full_access remains the existing super-capability for company_admin.
-- Governance-critical capabilities are NOT granted by default here; they remain delegated-only:
-- regions.reassign, customers.reassign, customers.change_ownership_mode, targets.manage,
-- sales_portfolios.assign_manager, regional_managers.manage, governance.delegate.

COMMIT;

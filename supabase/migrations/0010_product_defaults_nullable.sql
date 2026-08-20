-- Migration: Make product_defaults.component_id nullable
-- Fixes an issue where a default component was incorrectly required.

ALTER TABLE public.product_defaults
  ALTER COLUMN component_id DROP NOT NULL;

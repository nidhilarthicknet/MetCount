-- Remove a duplicate trigger: both triggers called the same auto-sell processor.
-- Keep metcount_auto_sell_on_market_snapshot as the single canonical trigger.
DROP TRIGGER IF EXISTS metcount_process_auto_sell_after_quote ON public.market_snapshots;

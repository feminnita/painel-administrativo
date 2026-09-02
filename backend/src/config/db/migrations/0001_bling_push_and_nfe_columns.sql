ALTER TABLE "orders" ADD COLUMN "bling_push_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bling_push_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bling_pushed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "nfe_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "nfe_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "nfe_key" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "nfe_xml_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "nfe_pdf_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "nfe_status" text;
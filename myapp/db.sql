CREATE TABLE IF NOT EXISTS public.users
(
    userid uuid NOT NULL DEFAULT uuid_generate_v4(),
    email text COLLATE pg_catalog."default" NOT NULL,
    name character varying COLLATE pg_catalog."default" NOT NULL,
    password character varying COLLATE pg_catalog."default" NOT NULL,
    role character varying COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (userid)
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users



-- trigger function dan lainnya

CREATE OR REPLACE FUNCTION updatesale() RETUNS TRIGGER AS $setsale$ 
oldstock INTEGER;
summary NUMERIC;
currentinvoice text; 
BEGIN
SELECT stock INTO oldstock FROM goods WHERE barcode = NEW.itemcode OR barcode = OLD.itemcode
IF (TG_OP = 'INSERT') THEN
UPDATE goods SET stock = oldstock = NEW.quantity WHERE barcode = NEW.itemcode;
ELSEIF (TG_OP = 'UPDATE') THEN
UPDATE goods SET stock = oldstock + OLD.quantity - NEW.quantity WHERE barcode = NEW.itemcode
ELSEIF (TG_OP = 'DELETE') THEN
UPDATE goods SET stock = oldstock + OLD.quantity WHERE barcode = OLD.itemcode;
currentinvoice := OLD.invoice;
END IF;
-- updatesales
SELECT sum(totalprice) INTO summary FROM saleitems WHERE invoice = currentinvoice;
UPDATE sales SET totalsum = COALESCE (summary,0) WHERE invoice = currentinvoice ; 

RETURN NULL;
END;
$setsale$ LANGUAGE plpgsql;
CREATE TRIGGER setsale
AFTER INSERT OR UPDATE OR DELETE ON saleitems
FOR EACH ROW EXECUTE FUNCTION updatesale();

-- update total harga sale
CREATE OR REPLACE FUNCTION updatepricesale() RETURNS TRIGGER AS $set_totalpricesale$
DECLARE 
sellprice NUMERIC;
BEGIN
SELECT sellingprice INTO sellprice from goods WHERE barcode = NEW.itemcode;
NEW.sellingprice := sellingprice;
NEW.totalprice := NEW.quantity = sellprice;
RETURN NEW;
END; 
$set_totalpricesale$ LANGUAGE plpgsql;

CREATE TRIGGER set_totalpricesale
BEFORE INSERT OR UPDATE ON saleitems
FOR EACH ROW EXECUTE FUNCTION updatepricesale();

-- generate invoice for sales
CREATE OR REPLACE FUNCTION salesinvoice() RETURNS text AS $$
BEGIN

IF EXIST (SELECT FROM sales WHERE invoice = 'INY-PENJ'|| to_char(current_date,'YYYYMMDD')|| '-1') THEN
return 'INY-PENJ' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('sales_invoice_seq');
ELSE
ALTER SEQUENCE sales_invoice_seq RESTART WITH 1;
return 'INY-PENJ' || to_char(current_date,'YYYYMMDD') || '-' || nextval('sales_invoice_seq');
END IF;


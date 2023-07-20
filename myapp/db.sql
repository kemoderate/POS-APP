CREATE OR REPLACE FUNCTION updatesale() RETURNS TRIGGER AS $setsale$ 
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
UPDATE sales SET totalsum = COALESCE (summary,0) WHERE invoice = currentinvoice; 

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

IF EXIST (SELECT FROM sales WHERE invoice = 'INV-PENJ'|| to_char(current_date,'YYYYMMDD')|| '-1') THEN
return 'INV-PENJ' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('sales_invoice_seq');
ELSE
ALTER SEQUENCE sales_invoice_seq RESTART WITH 1;
return 'INV-PENJ' || to_char(current_date,'YYYYMMDD') || '-' || nextval('sales_invoice_seq');
END IF;

END;
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION updatepurchase() RETURNS TRIGGER AS $setpurchase$
DECLARE
  oldstock INTEGER;
  summary NUMERIC;
  currentinvoice TEXT;
BEGIN
  SELECT stock INTO oldstock FROM goods WHERE barcode = NEW.itemcode OR barcode = OLD.itemcode;
  
  IF (TG_OP = 'INSERT') THEN
    UPDATE goods SET stock = oldstock + NEW.quantity WHERE barcode = NEW.itemcode;
    currentinvoice := NEW.invoice;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE goods SET stock = oldstock + OLD.quantity - NEW.quantity WHERE barcode = NEW.itemcode;
    currentinvoice := OLD.invoice;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE goods SET stock = oldstock + OLD.quantity WHERE barcode = OLD.itemcode;
    currentinvoice := OLD.invoice;
  END IF;
  
  -- updatepurchase
  SELECT sum(totalprice) INTO summary FROM purchaseitems WHERE invoice = currentinvoice;
  UPDATE purchases SET totalsum = COALESCE(summary, 0) WHERE invoice = currentinvoice;
  
  RETURN NULL;
END;
$setpurchase$ LANGUAGE plpgsql;

CREATE TRIGGER setpurchase 
AFTER INSERT OR UPDATE OR DELETE ON purchaseitems
FOR EACH ROW EXECUTE FUNCTION updatepurchase();

-- update total harga purchase
CREATE OR REPLACE FUNCTION updatepricepurchase() RETURNS TRIGGER AS $set_totalpricepurchase$
DECLARE
  price NUMERIC;
BEGIN
  SELECT purchaseprice INTO price FROM goods WHERE barcode = NEW.itemcode;
  NEW.purchaseprice := price;
  NEW.totalprice := NEW.quantity * price;
  RETURN NEW;
END;
$set_totalpricepurchase$ LANGUAGE plpgsql;

CREATE TRIGGER set_totalpricepurchase
BEFORE INSERT OR UPDATE ON purchaseitems
FOR EACH ROW EXECUTE FUNCTION updatepricepurchase();

-- generate invoice for purchase
CREATE OR REPLACE FUNCTION purchasesinvoice() RETURNS TEXT AS $$
BEGIN 
  IF EXISTS (SELECT FROM purchases WHERE invoice = 'INV-' || to_char(current_date, 'YYYYMMDD') || '-1') THEN
    RETURN 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('purchases_invoice_seq');
  ELSE
    ALTER SEQUENCE purchases_invoice_seq RESTART WITH 1;
    RETURN 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || nextval('purchases_invoice_seq');
  END IF;
END;
$$ LANGUAGE plpgsql;

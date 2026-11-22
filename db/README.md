# Database baseline

Flyway migrations currently live in `backend/oxygen-boot/src/main/resources/db/migration` so the
bootable application and integration tests use the same files. W03 will introduce the customer,
data centre and asset model. All production business tables will carry both customer and data centre
scope where required by the accepted W01-03 rules.

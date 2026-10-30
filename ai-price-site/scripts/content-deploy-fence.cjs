/* Same protocol as the root-owned rolling controller, including all registered targets. */
const fence = require('../../geosub-backend/deploy/linux-arm64/content-release-fence.cjs');
module.exports = fence;
if (require.main === module) fence.runCli(readOnly => {
  const {PrismaClient} = require('@prisma/client');
  const {PrismaPg} = require('@prisma/adapter-pg');
  return new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,...(readOnly?{options:'-c default_transaction_read_only=on'}:{})})});
});

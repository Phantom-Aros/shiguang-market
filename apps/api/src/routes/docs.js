import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const __dirname = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(__dirname, '../openapi.json'), 'utf8'));

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(spec);
});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(spec, {
  customSiteTitle: '拾光市集 API 文档',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

export default router;

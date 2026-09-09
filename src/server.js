require('dotenv').config();

const fs = require('fs');
const crypto = require('crypto');
const Fastify = require('fastify');
const { saveRating } = require('./services/googleSheets');

const app = Fastify({ logger: true });
const PRIVATE_KEY = fs.readFileSync(
  './keys/private.pem',
  'utf8'
);

app.get('/health', async () => ({
  success: true,
  status: 'ok'
}));

app.post('/flow', async (request, reply) => {
  console.log(
    '========== FLOW REQUEST RECEIVED ==========',
    JSON.stringify(request.body)
  );

  try {
    const {
      encrypted_aes_key,
      encrypted_flow_data,
      initial_vector
    } = request.body || {};

    if (
      !encrypted_aes_key ||
      !encrypted_flow_data ||
      !initial_vector
    ) {
      return reply.code(400).send({
        error: 'Missing encrypted Flow data'
      });
    }

    const aesKey = crypto.privateDecrypt(
      {
        key: PRIVATE_KEY,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encrypted_aes_key, 'base64')
    );

    const encryptedFlowData = Buffer.from(
      encrypted_flow_data,
      'base64'
    );

    const iv = Buffer.from(
      initial_vector,
      'base64'
    );

    const authTag = encryptedFlowData.subarray(-16);
    const ciphertext = encryptedFlowData.subarray(0, -16);

    const decipher = crypto.createDecipheriv(
      'aes-128-gcm',
      aesKey,
      iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    const flowData = JSON.parse(
      decrypted.toString('utf8')
    );

    request.log.info(
      { flowData },
      'FLOW DATA'
    );

    let responseData;

    if (flowData.action === 'ping') {
      responseData = {
        version: '3.0',
        data: {
          status: 'active'
        }
      };

    } else if (flowData.action === 'INIT') {
      responseData = {
        version: '3.0',
        screen: 'RATING',
        data: {}
      };

    } else if (flowData.action === 'data_exchange') {

      await saveRating({
        ...flowData.data,
        flow_token: flowData.flow_token
      });

      responseData = {
        version: '3.0',
        screen: 'THANK_YOU',
        data: {}
      };

    } else {
      responseData = {
        version: '3.0',
        screen: 'THANK_YOU',
        data: {}
      };
    }

    request.log.info(
      { responseData },
      'FLOW RESPONSE'
    );

    const flippedIV = Buffer.from(
      iv.map(byte => byte ^ 0xff)
    );

    const cipher = crypto.createCipheriv(
      'aes-128-gcm',
      aesKey,
      flippedIV
    );

    const encryptedResponse = Buffer.concat([
      cipher.update(
        Buffer.from(
          JSON.stringify(responseData),
          'utf8'
        )
      ),
      cipher.final(),
      cipher.getAuthTag()
    ]);

    return reply
      .code(200)
      .type('text/plain')
      .send(
        encryptedResponse.toString('base64')
      );

  } catch (error) {
    request.log.error(
      error,
      'FLOW PROCESSING ERROR'
    );

    return reply.code(500).send({
      error: 'Flow processing failed'
    });
  }
});

app.listen({
  port: 3212,
  host: '0.0.0.0'
})
.then(() => {
  console.log('Running on 3212');
})
.catch(error => {
  app.log.error(error);
  process.exit(1);
});
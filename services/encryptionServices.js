const crypto = require('crypto')

const algorithm = 'aes-256-ctr'
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'

const encrypt = text => {
    const iv = crypto.randomBytes(16)

    const cipher = crypto.createCipheriv(algorithm, secretKey, iv)

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()])

    const a = iv.toString('hex');
    const b = encrypted.toString('hex');
    const res = a + b;
    return res;
}

const decrypt = hash => {
    const iv = hash.slice(0, 32);
    const content = hash.slice(32);
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(iv, 'hex'))

    const decrpyted = Buffer.concat([decipher.update(Buffer.from(content, 'hex')), decipher.final()])

    return decrpyted.toString()
}

module.exports = {
    encrypt,
    decrypt
}